import SwiftUI

/// Write or dictate one memory, and choose who may hear it.
struct MemoryEditor: View {
    @State var memory: Memory
    let isNew: Bool

    @Environment(ArchiveStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var recorder = SpeechRecorder()
    @State private var textBeforeRecording = ""

    var body: some View {
        NavigationStack {
            Form {
                if memory.kind == .interview, let prompt = memory.prompt {
                    Section { Text(prompt).font(.headline) }
                } else if memory.kind == .reply {
                    Section {
                        TextField("Their message", text: Binding(
                            get: { memory.prompt ?? "" },
                            set: { memory.prompt = $0.isEmpty ? nil : $0 }
                        ), axis: .vertical)
                        .font(.headline)
                    } header: {
                        Text("Someone texts you")
                    } footer: {
                        Text("Reply below exactly as you would: same spelling, emoji, length. Think of a specific person sending it.")
                    }
                } else {
                    Section {
                        Picker("Type", selection: $memory.kind) {
                            ForEach(MemoryKind.allCases.filter { $0 != .interview && $0 != .reply }) { kind in
                                Label(kind.label, systemImage: kind.symbol).tag(kind)
                            }
                        }
                        TextField("Title (optional)", text: Binding(
                            get: { memory.prompt ?? "" },
                            set: { memory.prompt = $0.isEmpty ? nil : $0 }
                        ))
                    }
                }

                Section {
                    TextEditor(text: $memory.text)
                        .frame(minHeight: 220)
                        .overlay(alignment: .topLeading) {
                            if memory.text.isEmpty {
                                Text(placeholder).foregroundStyle(.tertiary).padding(.top, 8).padding(.leading, 4).allowsHitTesting(false)
                            }
                        }
                    Button {
                        Task { await toggleRecording() }
                    } label: {
                        Label(recorder.isRecording ? "Stop recording" : "Speak instead",
                              systemImage: recorder.isRecording ? "stop.circle.fill" : "mic.circle")
                    }
                    .tint(recorder.isRecording ? Color.red : Color.accentColor)
                    if let error = recorder.error {
                        Text(error).font(.footnote).foregroundStyle(.red)
                    }
                } footer: {
                    Text("Speech is transcribed on your phone. The audio itself isn't saved.")
                }

                if !store.archive.legacy.beneficiaries.isEmpty {
                    Section {
                        Toggle("Everyone I've chosen", isOn: Binding(
                            get: { memory.restrictedTo.isEmpty },
                            set: { everyone in memory.restrictedTo = everyone ? [] : store.archive.legacy.beneficiaries.prefix(1).map(\.id) }
                        ))
                        if !memory.restrictedTo.isEmpty {
                            ForEach(store.archive.legacy.beneficiaries) { person in
                                let isOnlyOne = memory.restrictedTo == [person.id]
                                Toggle(person.name, isOn: Binding(
                                    get: { memory.restrictedTo.contains(person.id) },
                                    set: { on in
                                        memory.restrictedTo.removeAll { $0 == person.id }
                                        if on { memory.restrictedTo.append(person.id) }
                                    }
                                ))
                                // An empty list means "everyone", so the last person can't be unticked.
                                .disabled(isOnlyOne)
                            }
                        }
                    } header: {
                        Text("Who can hear this")
                    } footer: {
                        Text("Your AI will only draw on this memory when talking with these people.")
                    }
                }

                if !isNew {
                    Section {
                        Button("Delete memory", role: .destructive) {
                            store.delete(memory)
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle(isNew ? "New memory" : "Edit memory")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { recorder.stop(); dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        recorder.stop()
                        memory.text = memory.text.trimmingCharacters(in: .whitespacesAndNewlines)
                        store.update(memory)
                        dismiss()
                    }
                    .disabled(memory.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                              || (memory.kind == .reply && (memory.prompt ?? "").isEmpty))
                }
            }
            .onChange(of: recorder.transcript) { _, spoken in
                guard !spoken.isEmpty else { return }
                memory.text = textBeforeRecording.isEmpty ? spoken : textBeforeRecording + "\n\n" + spoken
            }
        }
        .interactiveDismissDisabled(!memory.text.isEmpty)
    }

    private var placeholder: String {
        switch memory.kind {
        case .writing: "Paste a letter, an email, texts you've sent, a speech — anything that sounds like you."
        case .correction: "What should your AI say or do differently?"
        case .reply: "Your reply…"
        default: "Write it the way you'd say it."
        }
    }

    private func toggleRecording() async {
        if !recorder.isRecording {
            textBeforeRecording = memory.text.trimmingCharacters(in: .whitespacesAndNewlines)
            recorder.reset()
            if memory.kind == .story || memory.kind == .writing, memory.text.isEmpty { memory.kind = .voice }
        }
        await recorder.toggle()
    }
}
