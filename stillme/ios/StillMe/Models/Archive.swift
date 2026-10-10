import Foundation

// Everything stays on this iPhone. The only thing that ever leaves it is a
// sealed legacy file (see LegacySeal.swift) that the owner chooses to share.

enum MemoryKind: String, Codable, CaseIterable, Identifiable {
    case interview, story, writing, voice, correction, reply

    var id: String { rawValue }

    var label: String {
        switch self {
        case .interview: "Interview"
        case .story: "Story"
        case .writing: "Writing sample"
        case .voice: "Spoken"
        case .correction: "Correction"
        case .reply: "Reply sample"
        }
    }

    var symbol: String {
        switch self {
        case .interview: "questionmark.bubble"
        case .story: "book"
        case .writing: "pencil.and.scribble"
        case .voice: "waveform"
        case .correction: "arrow.uturn.backward.circle"
        case .reply: "bubble.left.and.text.bubble.right"
        }
    }
}

struct Memory: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var kind: MemoryKind
    var prompt: String?
    var text: String
    var createdAt: Date = .now
    /// Beneficiary ids who may hear this memory. Empty means everyone.
    var restrictedTo: [String] = []
}

struct Profile: Codable, Hashable {
    var name: String = ""
    var preferredName: String?
    var birthYear: Int?
    var hometown: String?
    var speakingStyle: String = ""
    var instructions: String = ""
    var boundaries: String = ""

    var displayName: String {
        if let p = preferredName, !p.isEmpty { return p }
        return name.isEmpty ? "You" : name
    }
}

/// Someone your AI should know about, whether or not they receive your legacy.
struct Person: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var name: String = ""
    var relationship: String = ""
    var iCallThem: String?
    var theyCallMe: String?
    var notes: String = ""
    /// Links to a recipient, so the AI knows when it's talking to this person.
    var beneficiaryId: String?
    /// e.g. "passed away 2019", "estranged", "we lost touch".
    var status: String?
}

struct LifeEvent: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var year: Int
    var month: Int?
    var title: String = ""
    var details: String?
}

/// Someone who receives a sealed legacy file.
struct Beneficiary: Codable, Identifiable, Hashable {
    var id: String = UUID().uuidString
    var name: String = ""
    var relationship: String = ""
    var personalNote: String?
}

struct LegacySettings: Codable, Hashable {
    var beneficiaries: [Beneficiary] = []

    init() {}

    // Tolerates archives saved by earlier versions, which had more fields here.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        beneficiaries = try c.decodeIfPresent([Beneficiary].self, forKey: .beneficiaries) ?? []
    }
}

struct Archive: Codable, Hashable {
    var profile = Profile()
    var memories: [Memory] = []
    var people: [Person] = []
    var timeline: [LifeEvent] = []
    var legacy = LegacySettings()

    init() {}

    // Tolerates archives saved before people/timeline existed.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        profile = try c.decodeIfPresent(Profile.self, forKey: .profile) ?? Profile()
        memories = try c.decodeIfPresent([Memory].self, forKey: .memories) ?? []
        people = try c.decodeIfPresent([Person].self, forKey: .people) ?? []
        timeline = try c.decodeIfPresent([LifeEvent].self, forKey: .timeline) ?? []
        legacy = try c.decodeIfPresent(LegacySettings.self, forKey: .legacy) ?? LegacySettings()
    }
}

/// A question the AI interviewer suggests after reading the archive.
struct FollowUpQuestion: Codable, Hashable, Identifiable {
    var question: String
    var why: String
    var area: String
    var id: String { question }
}

/// What a recipient unlocks: the owner's archive, filtered to what this
/// person may hear, plus who it's for.
struct LegacyPackage: Codable, Hashable {
    var createdAt: Date
    var recipient: Beneficiary
    var archive: Archive

    var ownerName: String { archive.profile.displayName }

    /// Builds the package for one person: only memories meant for everyone or for them.
    init(archive full: Archive, for recipient: Beneficiary, at date: Date = .now) {
        var a = full
        a.memories = full.memories.filter { $0.restrictedTo.isEmpty || $0.restrictedTo.contains(recipient.id) }
        a.legacy.beneficiaries = [recipient]
        self.createdAt = date
        self.recipient = recipient
        self.archive = a
    }
}

struct ChatMessage: Codable, Identifiable, Hashable {
    enum Role: String, Codable { case user, assistant }
    var id = UUID()
    var role: Role
    var content: String

    enum CodingKeys: String, CodingKey { case role, content }

    init(role: Role, content: String) {
        self.role = role
        self.content = content
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        role = try c.decode(Role.self, forKey: .role)
        content = try c.decode(String.self, forKey: .content)
    }
}

extension JSONEncoder {
    static let stillme: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()
}

extension JSONDecoder {
    static let stillme: JSONDecoder = {
        let d = JSONDecoder()
        // Accept dates with or without fractional seconds.
        d.dateDecodingStrategy = .custom { decoder in
            let s = try decoder.singleValueContainer().decode(String.self)
            if let date = try? Date(s, strategy: .iso8601) { return date }
            if let date = try? Date(s, strategy: Date.ISO8601FormatStyle(includingFractionalSeconds: true)) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "bad date \(s)"))
        }
        return d
    }()
}
