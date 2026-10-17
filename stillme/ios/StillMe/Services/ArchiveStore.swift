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
        return try? JSONDecoder.stillme.decode(T.self, from: data)
    }

    static func save(_ value: some Encodable, to name: String) {
        guard let data = try? JSONEncoder.stillme.encode(value) else { return }
        try? data.write(to: url(name), options: [.atomic, .completeFileProtection])
    }

    static func remove(_ name: String) {
        try? FileManager.default.removeItem(at: url(name))
    }
}

/// The owner's side: their archive, kept only on this iPhone.
@MainActor
@Observable
final class ArchiveStore {
    private static let file = "archive.json"
    private static let askedKey = "followUpsAsked"

    var archive: Archive
    var lastError: String?

    /// AI interviewer suggestions, kept on device until answered or dismissed.
    private(set) var followUps: [FollowUpQuestion] = LocalFiles.load([FollowUpQuestion].self, from: "followups.json") ?? []
    private(set) var isThinking = false

    private var lastSaved: Archive

    init() {
        let loaded = LocalFiles.load(Archive.self, from: Self.file) ?? Archive()
        archive = loaded
        lastSaved = loaded
    }

    /// Called whenever `archive` changes (see RootView).
    func persist() {
        guard archive != lastSaved else { return }
        LocalFiles.save(archive, to: Self.file)
        lastSaved = archive
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

    // MARK: AI

    func chat(_ messages: [ChatMessage], asBeneficiaryId: String?) -> AsyncThrowingStream<String, Error> {
        let who = archive.legacy.beneficiaries.first { $0.id == asBeneficiaryId }
        return PersonaEngine.reply(archive: archive, listener: .rehearsal(asBeneficiary: who), history: messages)
    }

    /// Asks the on-device interviewer what's missing from the archive.
    func askForFollowUps() async {
        isThinking = true
        defer { isThinking = false }
        let asked = UserDefaults.standard.stringArray(forKey: Self.askedKey) ?? []
        do {
            let fresh = try await PersonaEngine.followUps(archive: archive, alreadyAsked: asked + archive.memories.compactMap(\.prompt))
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

    // MARK: Legacy

    /// Seals everything this person may hear into a file, locked with a new code.
    func seal(for person: Beneficiary) throws -> (file: SealedLegacyFile, code: String) {
        let code = LegacySeal.newCode()
        let data = try LegacySeal.seal(LegacyPackage(archive: archive, for: person), code: code)
        let first = person.name.split(separator: " ").first.map(String.init) ?? "legacy"
        let from = archive.profile.displayName.split(separator: " ").first.map(String.init) ?? "Still Me"
        return (SealedLegacyFile(data: data, fileName: "\(from) for \(first).stillme"), code)
    }

    /// Erases everything on this iPhone. Files already shared are not affected.
    func deleteEverything() {
        LocalFiles.remove(Self.file)
        LocalFiles.remove("followups.json")
        UserDefaults.standard.removeObject(forKey: Self.askedKey)
        followUps = []
        archive = Archive()
        lastSaved = archive
    }
}

/// The recipient's side: someone who opened a sealed legacy file.
@MainActor
@Observable
final class RecipientStore {
    private static let packageFile = "legacy.json"
    private static let chatFile = "legacy-chat.json"

    private(set) var package: LegacyPackage?
    var conversation: [ChatMessage]
    /// A file opened from Files, Mail or AirDrop, waiting for its code.
    var pendingFile: Data?

    init() {
        package = LocalFiles.load(LegacyPackage.self, from: Self.packageFile)
        conversation = LocalFiles.load([ChatMessage].self, from: Self.chatFile) ?? []
    }

    /// Unlocks a sealed file and keeps the contents on this iPhone (encrypted by iOS).
    func unlock(_ data: Data, code: String) async throws {
        // Key derivation is deliberately slow; keep it off the main thread.
        let package = try await Task.detached { try LegacySeal.open(data, code: code) }.value
        LocalFiles.save(package, to: Self.packageFile)
        conversation = []
        LocalFiles.remove(Self.chatFile)
        self.package = package
        pendingFile = nil
    }

    func saveConversation() {
        LocalFiles.save(conversation, to: Self.chatFile)
    }

    func chat(_ messages: [ChatMessage]) -> AsyncThrowingStream<String, Error> {
        guard let package else {
            return AsyncThrowingStream { $0.finish(throwing: LegacySealError.damaged) }
        }
        return PersonaEngine.reply(archive: package.archive, listener: .legacy(package.recipient), history: messages)
    }

    #if DEBUG
    func loadDemo(package: LegacyPackage, conversation: [ChatMessage]) {
        self.package = package
        self.conversation = conversation
    }
    #endif

    func forget() {
        LocalFiles.remove(Self.packageFile)
        LocalFiles.remove(Self.chatFile)
        package = nil
        conversation = []
    }
}
