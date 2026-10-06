import Foundation

/// How much of you is recorded, by area. It's a nudge, not a grade: it points at
/// the thinnest part of the archive, where the AI would otherwise have to guess.
struct Depth {
    enum Area: String, CaseIterable, Identifiable {
        case interview, voice, people, timeline, stories, basics

        var id: String { rawValue }

        var title: String {
            switch self {
            case .interview: "Interview answers"
            case .voice: "Your voice"
            case .people: "People in your life"
            case .timeline: "Life timeline"
            case .stories: "Stories"
            case .basics: "The basics"
            }
        }

        var symbol: String {
            switch self {
            case .interview: "questionmark.bubble"
            case .voice: "quote.bubble"
            case .people: "person.3"
            case .timeline: "calendar"
            case .stories: "book"
            case .basics: "person.text.rectangle"
            }
        }

        /// Share of the overall score.
        var weight: Double {
            switch self {
            case .interview: 30
            case .voice: 25
            case .people: 15
            case .timeline: 10
            case .stories: 15
            case .basics: 5
            }
        }

        var nudge: String {
            switch self {
            case .interview: "Answer more interview questions. Aim for every topic."
            case .voice: "Answer reply samples and paste things you've written. This is how your AI learns to sound like you rather than an assistant."
            case .people: "Describe the people in your life: what you call them, your history, inside jokes."
            case .timeline: "Add the big dates: births, moves, jobs, losses. It keeps your AI from mixing up when things happened."
            case .stories: "Tell full stories, the ones you always tell, out loud if that's easier."
            case .basics: "Fill in your name, hometown, birth year, and how you talk in the You tab."
            }
        }
    }

    let scores: [Area: Double]

    init(_ archive: Archive) {
        let memories = archive.memories
        func ratio(_ value: Double, _ target: Double) -> Double { min(1, value / target) }

        let questions = Set(InterviewPrompts.allQuestions)
        let answered = Set(memories.filter { $0.kind == .interview }.compactMap(\.prompt)).intersection(questions).count

        let replies = memories.filter { $0.kind == .reply }.count
        let writtenWords = memories.filter { $0.kind == .writing }
            .reduce(0) { $0 + $1.text.split(whereSeparator: \.isWhitespace).count }
        let style = archive.profile.speakingStyle.count

        let describedPeople = archive.people.filter { $0.notes.count >= 40 }.count
        // Answers to the AI interviewer's follow-ups count as stories.
        let storyWords = memories.filter { $0.kind == .story || $0.kind == .voice || ($0.kind == .interview && !questions.contains($0.prompt ?? "")) }
            .reduce(0) { $0 + $1.text.split(whereSeparator: \.isWhitespace).count }

        let p = archive.profile
        let basics = [!p.name.isEmpty, p.birthYear != nil, !(p.hometown ?? "").isEmpty,
                      !p.instructions.isEmpty, style > 0].filter { $0 }.count

        scores = [
            .interview: ratio(Double(answered), Double(questions.count) * 0.75),
            .voice: ratio(Double(replies), 20) * 0.5 + ratio(Double(writtenWords), 3_000) * 0.3 + ratio(Double(style), 400) * 0.2,
            .people: ratio(Double(describedPeople), 8),
            .timeline: ratio(Double(archive.timeline.count), 20),
            .stories: ratio(Double(storyWords), 10_000),
            .basics: ratio(Double(basics), 5),
        ]
    }

    /// 0...100.
    var overall: Int {
        Int((Area.allCases.reduce(0) { $0 + (scores[$1] ?? 0) * $1.weight }).rounded())
    }

    /// The area with the most missing points.
    var weakest: Area {
        Area.allCases.max { (1 - (scores[$0] ?? 0)) * $0.weight < (1 - (scores[$1] ?? 0)) * $1.weight }!
    }

    var summary: String {
        switch overall {
        case ..<10: "Just getting started. Your AI barely knows you yet."
        case ..<30: "Your AI knows the outline of you."
        case ..<55: "Your AI can hold a real conversation, but it will still have to guess a lot."
        case ..<80: "Your AI knows you well. Fill in the thin areas."
        default: "Your AI has a deep picture of you. Keep adding as life happens."
        }
    }
}
