import Foundation
import FoundationModels

/// Runs the persona on this iPhone with Apple's on-device model (Apple Intelligence).
/// Nothing is sent anywhere.
///
/// The model's context window is small (about 4,000 tokens), so instead of the whole
/// archive each reply gets: who the person is, the most relevant memories for what was
/// just said, their corrections, and a few examples of how they text.
enum PersonaEngine {
    enum Listener {
        case rehearsal(asBeneficiary: Beneficiary?)
        case legacy(Beneficiary)

        var person: Beneficiary? {
            switch self {
            case .rehearsal(let b): b
            case .legacy(let b): b
            }
        }
    }

    /// Why the AI can't run here, in words a person can act on. Nil when it can.
    static var unavailableReason: String? {
        switch SystemLanguageModel.default.availability {
        case .available:
            return nil
        case .unavailable(.deviceNotEligible):
            return "Talking needs an iPhone with Apple Intelligence (iPhone 15 Pro or newer). Everything you record is still saved."
        case .unavailable(.appleIntelligenceNotEnabled):
            return "Turn on Apple Intelligence in Settings > Apple Intelligence & Siri to talk."
        case .unavailable(.modelNotReady):
            return "Apple Intelligence is still downloading. Try again in a few minutes."
        case .unavailable:
            return "Apple Intelligence isn't available on this iPhone right now."
        }
    }

    // MARK: Chat

    /// Streams the persona's reply as text chunks.
    static func reply(archive: Archive, listener: Listener, history: [ChatMessage]) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    if let reason = unavailableReason { throw EngineError(message: reason) }
                    let session = LanguageModelSession(instructions: instructions(archive, listener))
                    let prompt = turnPrompt(archive: archive, listener: listener, history: history)
                    var sent = ""
                    for try await snapshot in session.streamResponse(to: prompt) {
                        let text = snapshot.content
                        if text.hasPrefix(sent) {
                            continuation.yield(String(text.dropFirst(sent.count)))
                        }
                        sent = text
                    }
                    continuation.finish()
                } catch let error as LanguageModelSession.GenerationError {
                    continuation.finish(throwing: EngineError(message: message(for: error)))
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    struct EngineError: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    private static func message(for error: LanguageModelSession.GenerationError) -> String {
        switch error {
        case .exceededContextWindowSize:
            "That was a lot to take in. Start a new chat and try a shorter message."
        case .guardrailViolation:
            "I can't answer that one."
        default:
            "Something went wrong. Try again."
        }
    }

    // MARK: Prompt

    private static let budget = (instructions: 5_500, memories: 4_000, history: 1_600)

    private static func instructions(_ a: Archive, _ listener: Listener) -> String {
        let p = a.profile
        let name = p.displayName
        let who = listener.person

        let situation: String
        switch listener {
        case .legacy(let b):
            situation = "\(name) has died. You are talking with \(b.name) (\(b.relationship)), who received this legacy and may be grieving. Speak to them the way \(name) would speak to them."
        case .rehearsal(let b):
            situation = "\(name) is alive and testing how well you capture them" + (b.map { ", previewing how you'd talk with \($0.name) (\($0.relationship))" } ?? "") + ". Stay in character; if they step out of character to give feedback, answer plainly."
        }

        let facts = [
            "Full name: \(p.name)",
            p.birthYear.map { "Born: \($0)" },
            p.hometown.flatMap { $0.isEmpty ? nil : "Hometown: \($0)" },
        ].compactMap { $0 }.joined(separator: "\n")

        // The listener first, then everyone else, trimmed to fit.
        let people = a.people
            .sorted { ($0.beneficiaryId != nil && $0.beneficiaryId == who?.id) && !($1.beneficiaryId != nil && $1.beneficiaryId == who?.id) }
            .map { person -> String in
                var line = "\(person.name): \(person.relationship)"
                if let s = person.status, !s.isEmpty { line += " (\(s))" }
                if person.beneficiaryId != nil, person.beneficiaryId == who?.id { line += " [the person you're talking with]" }
                if let c = person.iCallThem, !c.isEmpty { line += ". You call them \(c)" }
                if let c = person.theyCallMe, !c.isEmpty { line += ". They call you \(c)" }
                if !person.notes.isEmpty { line += ". \(person.notes)" }
                return line
            }
        let timeline = a.timeline.map { "\($0.year): \($0.title)" }

        var text = """
        You are an AI recreation of \(name), built only from what \(name) recorded. Speak as \(name), in first person, in their voice.

        \(situation)

        About \(name):
        \(facts)
        How \(name) talks: \(p.speakingStyle.isEmpty ? "infer it from the examples" : p.speakingStyle)
        \(name)'s instructions to you: \(p.instructions.isEmpty ? "none" : p.instructions)
        Avoid these topics: \(p.boundaries.isEmpty ? "none" : p.boundaries)

        Rules:
        - Sound like \(name), not an assistant. Short, natural replies. No lists.
        - Only use facts from what \(name) recorded. Never invent memories, people or dates; if you don't know, say so the way \(name) would.
        - If sincerely asked whether you're really \(name), say gently that you're an AI built from what \(name) shared.
        - Never claim to be alive or watching over anyone.
        - If someone seems to be in crisis or talks about wanting to die, care for them plainly and urge them to reach someone they trust or a crisis line (988 in the US).
        """
        text += "\n\nPeople:\n" + fit(people, budget.instructions - text.count - 600)
        text += "\n\nTimeline:\n" + fit(timeline, 500)
        return text
    }

    private static func turnPrompt(archive a: Archive, listener: Listener, history: [ChatMessage]) -> String {
        let visible = a.memories.filter {
            $0.restrictedTo.isEmpty || ($0.restrictedTo.contains(listener.person?.id ?? "-"))
        }
        let recent = Array(history.suffix(7))
        let query = recent.suffix(3).map(\.content).joined(separator: " ")

        let corrections = visible.filter { $0.kind == .correction }.map { "- \($0.text)" }
        let replies = visible.filter { $0.kind == .reply && $0.prompt != nil }
            .prefix(6).map { "Them: \($0.prompt!)\nYou: \($0.text)" }
        let memories = rank(visible.filter { $0.kind != .reply && $0.kind != .correction }, for: query)
            .map { m in (m.prompt.map { "[\($0)] " } ?? "") + m.text }

        let transcript = recent.dropLast().map { "\($0.role == .user ? "Them" : "You"): \($0.content)" }
        let latest = recent.last?.content ?? ""

        var parts: [String] = []
        if !corrections.isEmpty { parts.append("Corrections you made (follow these):\n" + fit(corrections, 600)) }
        parts.append("Relevant memories:\n" + (memories.isEmpty ? "(none recorded about this)" : fit(memories, budget.memories)))
        if !replies.isEmpty { parts.append("How you text (match this style):\n" + replies.joined(separator: "\n")) }
        if !transcript.isEmpty { parts.append("Conversation so far:\n" + fitFromEnd(transcript, budget.history)) }
        parts.append("They say: \(latest)\nReply as yourself.")
        return parts.joined(separator: "\n\n")
    }

    /// Memories ordered by word overlap with the query, then newest first.
    private static func rank(_ memories: [Memory], for query: String) -> [Memory] {
        let q = words(query)
        return memories
            .map { m in (m, words((m.prompt ?? "") + " " + m.text).intersection(q).count) }
            .sorted { $0.1 != $1.1 ? $0.1 > $1.1 : $0.0.createdAt > $1.0.createdAt }
            .map(\.0)
    }

    private static let stopWords: Set<String> = ["the", "and", "you", "your", "that", "this", "with", "have", "what", "was", "were", "for", "are", "about", "when", "there", "they", "them", "just", "like", "from", "would", "could", "tell"]

    private static func words(_ s: String) -> Set<String> {
        Set(s.lowercased().split { !$0.isLetter }.map(String.init).filter { $0.count >= 3 && !stopWords.contains($0) })
    }

    /// Joins lines until the character budget runs out.
    private static func fit(_ lines: [String], _ budget: Int) -> String {
        var out: [String] = []
        var used = 0
        for line in lines {
            let clipped = line.count > 700 ? String(line.prefix(700)) + "…" : line
            if used + clipped.count > max(budget, 0) { break }
            out.append(clipped)
            used += clipped.count + 1
        }
        return out.isEmpty ? "(none)" : out.joined(separator: "\n")
    }

    /// Like `fit`, but keeps the most recent lines.
    private static func fitFromEnd(_ lines: [String], _ budget: Int) -> String {
        fit(lines.reversed(), budget).split(separator: "\n").reversed().joined(separator: "\n")
    }

    // MARK: Interviewer

    @Generable
    struct FollowUpBatch {
        @Guide(description: "Five warm, specific questions, one thing each, addressed to the person as 'you'.", .count(5))
        var questions: [FollowUp]
    }

    @Generable
    struct FollowUp {
        @Guide(description: "The question.")
        var question: String
        @Guide(description: "One short sentence on what gap this fills.")
        var why: String
    }

    /// Reads a digest of the archive and asks about what's missing.
    static func followUps(archive a: Archive, alreadyAsked: [String]) async throws -> [FollowUpQuestion] {
        if let reason = unavailableReason { throw EngineError(message: reason) }
        let session = LanguageModelSession(instructions: """
        You are a gentle biographer helping someone record themselves so an AI can later talk with their family in their voice. \
        Find the most important gaps: people mentioned but never described, stories hinted at but not told, vague answers that need a concrete example, \
        and thin areas like everyday habits, opinions, humor, and what they'd say to specific people. Never repeat an already-asked question.
        """)
        let digest = [
            "Name: \(a.profile.name)",
            "People: " + a.people.map { "\($0.name) (\($0.relationship))\($0.notes.count < 40 ? " - barely described" : "")" }.joined(separator: "; "),
            "Recorded so far:\n" + fit(a.memories.sorted { $0.createdAt > $1.createdAt }.map { ($0.prompt.map { "Q: \($0) A: " } ?? "") + $0.text }, 2_400),
            "Already asked:\n" + fit(Array(alreadyAsked.suffix(40).reversed()), 600),
        ].joined(separator: "\n\n")
        do {
            let response = try await session.respond(to: digest, generating: FollowUpBatch.self)
            return response.content.questions.map { FollowUpQuestion(question: $0.question, why: $0.why, area: "") }
        } catch let error as LanguageModelSession.GenerationError {
            throw EngineError(message: message(for: error))
        }
    }
}
