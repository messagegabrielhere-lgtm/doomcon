import SwiftUI

struct InterviewView: View {
    @Environment(ArchiveStore.self) private var store
    @State private var newMemory: Memory?

    var body: some View {
        let replies = store.archive.memories.filter { $0.kind == .reply }.count
        NavigationStack {
            List {
                Section {
                    DepthCard(depth: store.depth)
                }

                FollowUpsSection()

                Section {
                    NavigationLink { PeopleView() } label: {
                        LabeledContent { Text("\(store.archive.people.count)") } label: {
                            Label("People in your life", systemImage: "person.3")
                        }
                    }
                    NavigationLink { TimelineView() } label: {
                        LabeledContent { Text("\(store.archive.timeline.count)") } label: {
                            Label("Life timeline", systemImage: "calendar")
                        }
                    }
                    NavigationLink { ReplySamplesView() } label: {
                        LabeledContent { Text("\(replies)/\(InterviewPrompts.replyScenarios.count)") } label: {
                            Label("How you'd reply", systemImage: "bubble.left.and.text.bubble.right")
                        }
                    }
                } header: {
                    Text("Your life")
                }

                Section("Add your own") {
                    quickAdd(.story, "Tell a story")
                    quickAdd(.voice, "Talk freely (voice)")
                    quickAdd(.writing, "Paste something you wrote")
                }

                Section {
                    ForEach(InterviewPrompts.topics) { topic in
                        NavigationLink {
                            TopicView(topic: topic)
                        } label: {
                            let done = topic.questions.filter { !store.answers(to: $0).isEmpty }.count
                            LabeledContent {
                                Text("\(done)/\(topic.questions.count)")
                            } label: {
                                Label(topic.title, systemImage: topic.symbol)
                            }
                        }
                    }
                } header: {
                    Text("Interview")
                } footer: {
                    Text("Answer as if you're talking to someone you love. Ramble, swear, laugh. The way you'd really say it is what matters. A little each day adds up: one question a day covers every topic in about five months.")
                }
            }
            .brandBackground()
            .navigationTitle("Record")
            .sheet(item: $newMemory) { memory in
                MemoryEditor(memory: memory, isNew: true)
            }
        }
    }

    private func quickAdd(_ kind: MemoryKind, _ title: String) -> some View {
        Button {
            newMemory = Memory(kind: kind, text: "")
        } label: {
            Label(title, systemImage: kind.symbol)
        }
    }
}

struct TopicView: View {
    let topic: InterviewTopic
    @Environment(ArchiveStore.self) private var store
    @State private var editing: Memory?

    var body: some View {
        List {
            Section {
                Text(topic.purpose).font(.callout).foregroundStyle(.secondary)
            }
            ForEach(topic.questions, id: \.self) { question in
                let answers = store.answers(to: question)
                Button {
                    editing = answers.first ?? Memory(kind: .interview, prompt: question, text: "")
                } label: {
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: answers.isEmpty ? "circle" : "checkmark.circle.fill")
                            .foregroundStyle(answers.isEmpty ? Color.secondary : Color.accentColor)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(question).foregroundStyle(.primary)
                            if let first = answers.first {
                                Text(first.text).lineLimit(2).font(.footnote).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .brandBackground()
        .navigationTitle(topic.title)
        .sheet(item: $editing) { memory in
            MemoryEditor(memory: memory, isNew: store.archive.memories.allSatisfy { $0.id != memory.id })
        }
    }
}
