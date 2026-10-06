import Foundation
import Observation

/// Files in Application Support, encrypted by iOS while the phone is locked.
enum LocalFiles {
    static func url(_ name: String) -> URL {
        let dir = URL.applicationSupportDirectory
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appending(path: name)
    }

    static func load<T: Decodable>(_ type: T.Type, from name: String) -> T? {
        guard let data = try? Data(contentsOf: url(name)) else { return nil }
        return try? JSONDecoder.evensong.decode(T.self, from: data)
    }

    static func save(_ value: some Encodable, to name: String) {
        guard let data = try? JSONEncoder.evensong.encode(value) else { return }
        try? data.write(to: url(name), options: [.atomic, .completeFileProtection])
    }

    static func remove(_ name: String) {
        try? FileManager.default.removeItem(at: url(name))
    }
}

/// The owner's side: their archive, kept on device and backed up to the server.
@MainActor
@Observable
final class ArchiveStore {
    private static let file = "archive.json"
    private static let tokenKey = "ownerToken"
    private static let dirtyKey = "archiveDirty"

    var archive: Archive
    private(set) var status: AccountStatus?
    private(set) var isSyncing = false
    var lastError: String?

    /// AI interviewer suggestions, kept on device until answered or dismissed.
    private(set) var followUps: [FollowUpQuestion] = LocalFiles.load([FollowUpQuestion].self, from: "followups.json") ?? []
    private(set) var isThinking = false
    private static let askedKey = "followUpsAsked"

    private var lastSaved: Archive

    init() {
        let loaded = LocalFiles.load(Archive.self, from: Self.file) ?? Archive()
        archive = loaded
        lastSaved = loaded
    }

    var hasAccount: Bool { Keychain.get(Self.tokenKey) != nil }
    var needsSync: Bool { UserDefaults.standard.bool(forKey: Self.dirtyKey) }

    private var api: APIClient {
        APIClient(credential: Keychain.get(Self.tokenKey).map { .owner($0) })
    }

    /// Called whenever `archive` changes (see RootView).
    func persist() {
        guard archive != lastSaved else { return }
        LocalFiles.save(archive, to: Self.file)
        lastSaved = archive
        UserDefaults.standard.set(true, forKey: Self.dirtyKey)
    }

    // MARK: Memories

    func add(_ memory: Memory) {
        archive.memories.append(memory)
    }

    func update(_ memory: Memory) {
        guard let i = archive.memories.firstIndex(where: { $0.id == memory.id }) else { return add(memory) }
        archive.memories[i] = memory
    }

    func delete(_ memory: Memory) {
        archive.memories.removeAll { $0.id == memory.id }
    }

    func answers(to question: String) -> [Memory] {
        archive.memories.filter { $0.prompt == question }
    }

    var depth: Depth { Depth(archive) }

    func person(forBeneficiary id: String) -> Person? {
        archive.people.first { $0.beneficiaryId == id }
    }

    func upsert(_ person: Person) {
        if let i = archive.people.firstIndex(where: { $0.id == person.id }) {
            archive.people[i] = person
        } else {
            archive.people.append(person)
        }
    }

    func upsert(_ event: LifeEvent) {
        if let i = archive.timeline.firstIndex(where: { $0.id == event.id }) {
            archive.timeline[i] = event
        } else {
            archive.timeline.append(event)
        }
        archive.timeline.sort { ($0.year, $0.month ?? 0) < ($1.year, $1.month ?? 0) }
    }

    // MARK: AI interviewer

    /// Backs up, then asks the server's interviewer what's missing.
    func askForFollowUps() async {
        isThinking = true
        defer { isThinking = false }
        await syncIfNeeded()
        guard lastError == nil else { return }
        let asked = UserDefaults.standard.stringArray(forKey: Self.askedKey) ?? []
        do {
            let fresh = try await api.followUps(alreadyAsked: asked + archive.memories.compactMap(\.prompt))
            followUps = fresh
            UserDefaults.standard.set(Array((asked + fresh.map(\.question)).suffix(300)), forKey: Self.askedKey)
            LocalFiles.save(followUps, to: "followups.json")
            lastError = fresh.isEmpty ? "No new questions right now. Try again after recording more." : nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    func dismissFollowUp(_ question: FollowUpQuestion) {
        followUps.removeAll { $0 == question }
        LocalFiles.save(followUps, to: "followups.json")
    }

    // MARK: Server

    private func ensureAccount() async throws {
        if hasAccount { return }
        Keychain.set(Self.tokenKey, try await APIClient.createAccount())
    }

    /// Backs up the archive. This is not a check-in; see `checkIn()`.
    func sync() async {
        await run {
            try await self.ensureAccount()
            let snapshot = self.archive
            self.status = try await self.api.upload(snapshot)
            if snapshot == self.archive { UserDefaults.standard.set(false, forKey: Self.dirtyKey) }
        }
    }

    func syncIfNeeded() async {
        if needsSync || !hasAccount { await sync() }
    }

    func refreshStatus() async {
        guard hasAccount else { return }
        await run { self.status = try await self.api.status() }
    }

    func checkIn() async {
        await run {
            try await self.ensureAccount()
            self.status = try await self.api.checkIn()
        }
    }

    func revokeRelease() async {
        await run { self.status = try await self.api.revoke() }
    }

    /// Deletes the server copy and everything on this device.
    func deleteEverything() async -> Bool {
        var ok = false
        await run {
            if self.hasAccount { try await self.api.deleteAccount() }
            Keychain.set(Self.tokenKey, nil)
            LocalFiles.remove(Self.file)
            LocalFiles.remove("followups.json")
            UserDefaults.standard.removeObject(forKey: Self.askedKey)
            self.followUps = []
            UserDefaults.standard.removeObject(forKey: Self.dirtyKey)
            self.archive = Archive()
            self.lastSaved = self.archive
            self.status = nil
            ok = true
        }
        return ok
    }

    func chat(_ messages: [ChatMessage], asBeneficiaryId: String?) -> AsyncThrowingStream<String, Error> {
        api.chat(messages, asBeneficiaryId: asBeneficiaryId)
    }

    private func run(_ work: @escaping () async throws -> Void) async {
        isSyncing = true
        defer { isSyncing = false }
        do {
            try await work()
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }
}

/// The recipient's side: someone who received an access code.
@MainActor
@Observable
final class RecipientStore {
    private static let codeKey = "legacyCode"
    private static let grantFile = "grant.json"
    private static let chatFile = "legacy-chat.json"

    private(set) var grant: LegacyGrant?
    var conversation: [ChatMessage]

    init() {
        grant = LocalFiles.load(LegacyGrant.self, from: Self.grantFile)
        conversation = LocalFiles.load([ChatMessage].self, from: Self.chatFile) ?? []
    }

    func redeem(_ code: String) async throws {
        let grant = try await APIClient.redeem(code: code)
        Keychain.set(Self.codeKey, code)
        LocalFiles.save(grant, to: Self.grantFile)
        self.grant = grant
    }

    func saveConversation() {
        LocalFiles.save(conversation, to: Self.chatFile)
    }

    func chat(_ messages: [ChatMessage]) -> AsyncThrowingStream<String, Error> {
        APIClient(credential: Keychain.get(Self.codeKey).map { .legacy($0) }).chat(messages)
    }

    func forget() {
        Keychain.set(Self.codeKey, nil)
        LocalFiles.remove(Self.grantFile)
        LocalFiles.remove(Self.chatFile)
        grant = nil
        conversation = []
    }
}
