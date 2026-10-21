import SwiftUI

/// Talk to your own AI while you're alive, and correct it when it's off.
struct RehearseView: View {
    @Environment(ArchiveStore.self) private var store
    @State private var messages: [ChatMessage] = DemoData.initialRehearsal
    @State private var asBeneficiaryId: String?
    @State private var correction: Memory?
    @State private var preparing = false

    var body: some View {
        NavigationStack {
            Group {
                if store.archive.profile.name.isEmpty {
                    ContentUnavailableView("Tell it who you are first", systemImage: "person.crop.circle.badge.questionmark",
                                           description: Text("Add your name in the You tab, then record a few memories."))
                } else if store.archive.memories.count < 3 {
                    ContentUnavailableView("Record a few memories first", systemImage: "mic",
                                           description: Text("Your AI needs something to go on. Answer at least three questions in the Record tab."))
                } else {
                    ChatView(
                        messages: $messages,
                        personaName: store.archive.profile.displayName,
                        send: { store.chat($0, asBeneficiaryId: asBeneficiaryId) },
                        onCorrect: { question, reply in
                            correction = Memory(
                                kind: .correction,
                                prompt: "When asked \u{201C}\(question.prefix(200))\u{201D}, my AI said \u{201C}\(reply.prefix(300))\u{201D}",
                                text: "",
                                restrictedTo: asBeneficiaryId.map { [$0] } ?? []
                            )
                        },
                        intro: PersonaEngine.unavailableReason ?? "This is your AI as the people you chose will meet it. Ask it anything. Long-press a reply that doesn't sound like you to correct it.",
                        suggestions: rehearsalSuggestions
                    )
                }
            }
            .brandBackground()
            .navigationTitle("Rehearse")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !store.archive.legacy.beneficiaries.isEmpty {
                        Menu {
                            Picker("Talking with", selection: $asBeneficiaryId) {
                                Text("Anyone").tag(String?.none)
                                ForEach(store.archive.legacy.beneficiaries) { person in
                                    Text(person.name).tag(Optional(person.id))
                                }
                            }
                        } label: {
                            Label(listenerName, systemImage: "person.2")
                        }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("New chat", systemImage: "square.and.pencil") { messages = [] }
                        .disabled(messages.isEmpty)
                }
            }
            .onChange(of: asBeneficiaryId) { messages = [] }
            .sheet(item: $correction) { memory in
                MemoryEditor(memory: memory, isNew: true)
            }
        }
    }

    private var rehearsalSuggestions: [String] {
        func first(_ name: String) -> String { name.split(separator: " ").first.map(String.init) ?? name }
        var list = ["What was your first job like?", "What would you tell me on a really bad day?"]
        if let person = store.archive.people.first(where: { $0.beneficiaryId == nil }) {
            list.insert("Tell me about \(first(person.name)).", at: 0)
        }
        if let id = asBeneficiaryId, let b = store.archive.legacy.beneficiaries.first(where: { $0.id == id }) {
            list.append("It's \(first(b.name)). I miss you.")
        }
        return list
    }

    private var listenerName: String {
        store.archive.legacy.beneficiaries.first { $0.id == asBeneficiaryId }?.name ?? "Anyone"
    }
}
