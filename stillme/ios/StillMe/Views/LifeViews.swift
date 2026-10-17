import SwiftUI

// MARK: - People

struct PeopleView: View {
    @Environment(ArchiveStore.self) private var store
    @State private var editing: Person?

    var body: some View {
        List {
            Section {
                Text("Everyone your AI might be asked about or talk with: family, partners, friends, people you've lost. Recipients are added here automatically.")
                    .font(.callout)
                    .foregroundStyle(Color.slate)
            }
            ForEach(store.archive.people) { person in
                Button { editing = person } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(person.name).foregroundStyle(Color.ink)
                            if person.beneficiaryId != nil {
                                Image(systemName: "envelope.badge.shield.half.filled").foregroundStyle(.tint).font(.caption)
                            }
                            Spacer()
                            if person.notes.count < 40 {
                                Text("Add more").font(.caption).foregroundStyle(.orange)
                            }
                        }
                        Text([person.relationship, person.status].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(Color.slate)
                    }
                }
            }
            .onDelete { store.archive.people.remove(atOffsets: $0) }
        }
        .brandBackground()
        .navigationTitle("People")
        .toolbar {
            Button("Add", systemImage: "plus") { editing = Person() }
        }
        .sheet(item: $editing) { PersonEditor(person: $0) }
    }
}

struct PersonEditor: View {
    @State var person: Person
    @Environment(ArchiveStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $person.name)
                    TextField("Relationship (my sister, college roommate…)", text: $person.relationship)
                    TextField("What I call them", text: optional($person.iCallThem))
                    TextField("What they call me", text: optional($person.theyCallMe))
                    TextField("Status (optional: passed away 2019, estranged…)", text: optional($person.status))
                }
                Section {
                    TextEditor(text: $person.notes).frame(minHeight: 200)
                } header: {
                    Text("About them, and about the two of you")
                } footer: {
                    Text("How you met, what they're like, what you love about them, what drives you crazy, inside jokes, the memory you think of first, and how you'd talk to them. Your AI can mention this to anyone you've chosen, so keep secrets in memories limited to specific people.")
                }
                if !store.archive.legacy.beneficiaries.isEmpty {
                    Section {
                        Picker("Receives my legacy as", selection: $person.beneficiaryId) {
                            Text("Not a recipient").tag(String?.none)
                            ForEach(store.archive.legacy.beneficiaries) { b in
                                Text(b.name).tag(Optional(b.id))
                            }
                        }
                    } footer: {
                        Text("Linking tells your AI who it's talking to, so it can talk to them the way you would.")
                    }
                }
            }
            .brandBackground()
            .navigationTitle(person.name.isEmpty ? "New person" : person.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        store.upsert(person)
                        dismiss()
                    }
                    .disabled(person.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

// MARK: - Timeline

struct TimelineView: View {
    @Environment(ArchiveStore.self) private var store
    @State private var editing: LifeEvent?

    var body: some View {
        List {
            Section {
                Text("The big dates: born, schools, moves, jobs, relationships, kids, losses, health, trips. Approximate years are fine.")
                    .font(.callout)
                    .foregroundStyle(Color.slate)
            }
            ForEach(store.archive.timeline) { event in
                Button { editing = event } label: {
                    HStack(alignment: .firstTextBaseline, spacing: 14) {
                        Text(verbatim: String(event.year))
                            .font(.headline.monospacedDigit())
                            .foregroundStyle(.tint)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(event.title).foregroundStyle(Color.ink)
                            if let details = event.details, !details.isEmpty {
                                Text(details).font(.caption).foregroundStyle(Color.slate).lineLimit(2)
                            }
                        }
                    }
                }
            }
            .onDelete { store.archive.timeline.remove(atOffsets: $0) }
        }
        .brandBackground()
        .navigationTitle("Timeline")
        .toolbar {
            Button("Add", systemImage: "plus") {
                editing = LifeEvent(year: store.archive.timeline.last?.year ?? store.archive.profile.birthYear ?? 2000)
            }
        }
        .sheet(item: $editing) { EventEditor(event: $0) }
    }
}

struct EventEditor: View {
    @State var event: LifeEvent
    @Environment(ArchiveStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private let currentYear = Calendar.current.component(.year, from: .now)

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("What happened", text: $event.title)
                    Picker("Year", selection: $event.year) {
                        ForEach((1900...currentYear).reversed(), id: \.self) { Text(verbatim: String($0)).tag($0) }
                    }
                    Picker("Month", selection: $event.month) {
                        Text("Not sure").tag(Int?.none)
                        ForEach(1...12, id: \.self) { m in
                            Text(Calendar.current.monthSymbols[m - 1]).tag(Optional(m))
                        }
                    }
                }
                Section("Details") {
                    TextEditor(text: Binding(
                        get: { event.details ?? "" },
                        set: { event.details = $0.isEmpty ? nil : $0 }
                    ))
                    .frame(minHeight: 120)
                }
            }
            .brandBackground()
            .navigationTitle("Life event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        store.upsert(event)
                        dismiss()
                    }
                    .disabled(event.title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

// MARK: - Reply samples

struct ReplySamplesView: View {
    @Environment(ArchiveStore.self) private var store
    @State private var editing: Memory?

    private func answer(to message: String) -> Memory? {
        store.archive.memories.first { $0.kind == .reply && $0.prompt == message }
    }

    private var custom: [Memory] {
        let stock = Set(InterviewPrompts.replyScenarios)
        return store.archive.memories.filter { $0.kind == .reply && !stock.contains($0.prompt ?? "") }
    }

    var body: some View {
        List {
            Section {
                Text("Reply to each message exactly the way you'd text back. Same spelling, emoji, and length. This teaches your AI your real voice better than anything else.")
                    .font(.callout)
                    .foregroundStyle(Color.slate)
            }
            Section("Messages") {
                ForEach(InterviewPrompts.replyScenarios, id: \.self) { message in
                    let existing = answer(to: message)
                    Button {
                        editing = existing ?? Memory(kind: .reply, prompt: message, text: "")
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(message)
                                .padding(.horizontal, 12).padding(.vertical, 7)
                                .background(Color.canvas, in: RoundedRectangle(cornerRadius: 14))
                                .foregroundStyle(Color.ink)
                            if let existing {
                                Text(existing.text)
                                    .padding(.horizontal, 12).padding(.vertical, 7)
                                    .background(Color.pulse, in: RoundedRectangle(cornerRadius: 14))
                                    .foregroundStyle(Color.onAccent)
                                    .frame(maxWidth: .infinity, alignment: .trailing)
                                    .lineLimit(3)
                            }
                        }
                    }
                }
            }
            if !custom.isEmpty {
                Section("Your own") {
                    ForEach(custom) { memory in
                        Button { editing = memory } label: {
                            LabeledContent(memory.prompt ?? "", value: memory.text).foregroundStyle(Color.ink)
                        }
                    }
                }
            }
        }
        .brandBackground()
        .navigationTitle("Reply samples")
        .toolbar {
            Button("Write your own", systemImage: "plus") { editing = Memory(kind: .reply, prompt: nil, text: "") }
        }
        .sheet(item: $editing) { memory in
            MemoryEditor(memory: memory, isNew: store.archive.memories.allSatisfy { $0.id != memory.id })
        }
    }
}

// MARK: - Depth

struct DepthCard: View {
    let depth: Depth

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("\(depth.overall)%")
                    .font(.system(size: 44, weight: .heavy))
                    .contentTransition(.numericText())
                Text("of you recorded").foregroundStyle(Color.slate)
            }
            Text(depth.summary).font(.callout)
            ForEach(Depth.Area.allCases) { area in
                HStack(spacing: 10) {
                    Image(systemName: area.symbol).frame(width: 22).foregroundStyle(Color.slate)
                    Text(area.title).font(.caption).frame(width: 120, alignment: .leading)
                    ProgressView(value: depth.scores[area] ?? 0)
                }
            }
            Label(depth.weakest.nudge, systemImage: "arrow.right.circle.fill")
                .font(.footnote)
                .foregroundStyle(Color.pulse)
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - AI follow-ups

struct FollowUpsSection: View {
    @Environment(ArchiveStore.self) private var store
    @State private var answering: Memory?
    @State private var answeringQuestion: FollowUpQuestion?

    var body: some View {
        Section {
            ForEach(store.followUps) { item in
                Button {
                    answeringQuestion = item
                    answering = Memory(kind: .interview, prompt: item.question, text: "")
                } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.question).foregroundStyle(Color.ink)
                        Text(item.why).font(.caption).foregroundStyle(Color.slate)
                    }
                }
                .swipeActions {
                    Button("Skip", systemImage: "xmark") { store.dismissFollowUp(item) }
                }
            }
            Button {
                Task { await store.askForFollowUps() }
            } label: {
                HStack {
                    Label(store.followUps.isEmpty ? "Find what's missing" : "Ask me different questions",
                          systemImage: "wand.and.stars")
                    if store.isThinking { Spacer(); ProgressView() }
                }
            }
            .disabled(store.isThinking || store.archive.profile.name.isEmpty)
        } header: {
            Text("Dig deeper")
        } footer: {
            if store.archive.profile.name.isEmpty {
                Text("Add your name in the You tab first.")
            } else {
                Text("An AI interviewer reads what you've recorded and asks about the gaps: people you mentioned but never described, stories you hinted at, and answers that need a concrete example.")
            }
        }
        .sheet(item: $answering, onDismiss: {
            if let q = answeringQuestion, !store.answers(to: q.question).isEmpty { store.dismissFollowUp(q) }
            answeringQuestion = nil
        }) { memory in
            MemoryEditor(memory: memory, isNew: true)
        }
    }
}

private func optional(_ binding: Binding<String?>) -> Binding<String> {
    Binding(get: { binding.wrappedValue ?? "" }, set: { binding.wrappedValue = $0.isEmpty ? nil : $0 })
}
