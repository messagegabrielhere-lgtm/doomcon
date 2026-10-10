import SwiftUI

/// Who receives your legacy, and the sealed files you leave them.
struct LegacyView: View {
    @Environment(ArchiveStore.self) private var store
    @State private var editing: Beneficiary?
    @State private var sealing: Beneficiary?

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            Form {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        step("1", "Seal a file for each person", "It holds everything they're allowed to hear, locked with a code.")
                        step("2", "Send them the file now", "AirDrop, Messages or email. It stays locked.")
                        step("3", "Leave the code for later", "Put it in your will, or give it to someone you trust to hand over when you die.")
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("How it works")
                } footer: {
                    Text("Still Me never uploads anything. The file and its code are the only way in.")
                }

                Section {
                    ForEach(store.archive.legacy.beneficiaries) { person in
                        HStack {
                            Button { editing = person } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(person.name).foregroundStyle(Color.ink)
                                    Text(person.relationship).font(.caption).foregroundStyle(Color.slate)
                                }
                            }
                            .buttonStyle(.plain)
                            Spacer()
                            Button("Seal", systemImage: "lock.doc") { sealing = person }
                                .buttonStyle(.bordered)
                                .controlSize(.small)
                        }
                    }
                    .onDelete { store.archive.legacy.beneficiaries.remove(atOffsets: $0) }
                    Button("Add someone", systemImage: "person.badge.plus") {
                        editing = Beneficiary()
                    }
                } header: {
                    Text("Who receives it")
                } footer: {
                    Text("Each person only gets memories meant for everyone or for them. Seal again after recording more; the new file has a new code.")
                }
            }
            .brandBackground()
            .navigationTitle("Legacy")
            .sheet(item: $editing) { BeneficiaryEditor(person: $0) }
            .sheet(item: $sealing) { SealSheet(person: $0) }
        }
    }

    private func step(_ number: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(number)
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(Color.pulse)
                .frame(width: 18)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Color.ink)
                Text(detail).font(.footnote).foregroundStyle(Color.slate)
            }
        }
    }
}

/// Seals a file for one person and shows the code to keep.
private struct SealSheet: View {
    let person: Beneficiary
    @Environment(ArchiveStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var result: (file: SealedLegacyFile, code: String)?
    @State private var error: String?
    @State private var savedCode = false
    @State private var copied = false

    var body: some View {
        NavigationStack {
            Form {
                if let result {
                    Section {
                        Text(result.code)
                            .font(.system(.title2, design: .monospaced).weight(.bold))
                            .foregroundStyle(Color.ink)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                        Button(copied ? "Copied" : "Copy code", systemImage: copied ? "checkmark" : "doc.on.doc") {
                            UIPasteboard.general.string = result.code
                            copied = true
                        }
                    } header: {
                        Text("Unlock code for \(person.name)")
                    } footer: {
                        Text("Write this down and put it in your will, or give it to someone you trust. Don't send it with the file. Still Me can't show this code again or recover it.")
                    }
                    Section {
                        Toggle("I've saved the code somewhere safe", isOn: $savedCode)
                        ShareLink(item: result.file, preview: SharePreview(result.file.fileName, image: Image(systemName: "lock.doc"))) {
                            Label("Send the file to \(person.name)", systemImage: "square.and.arrow.up")
                        }
                        .disabled(!savedCode)
                    } footer: {
                        Text("They can open it with Still Me any time, but it stays locked until they have the code.")
                    }
                } else if let error {
                    Text(error).foregroundStyle(.red)
                } else {
                    HStack { ProgressView(); Text("Sealing…").foregroundStyle(Color.slate) }
                }
            }
            .brandBackground()
            .navigationTitle("Seal for \(person.name.split(separator: " ").first.map(String.init) ?? person.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .task {
                do {
                    result = try store.seal(for: person)
                } catch {
                    self.error = error.localizedDescription
                }
            }
        }
        .interactiveDismissDisabled(result != nil && !savedCode)
    }
}

struct BeneficiaryEditor: View {
    @State var person: Beneficiary
    @Environment(ArchiveStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $person.name).textContentType(.name)
                    TextField("Relationship (daughter, best friend…)", text: $person.relationship)
                }
                Section {
                    TextEditor(text: Binding(
                        get: { person.personalNote ?? "" },
                        set: { person.personalNote = $0.isEmpty ? nil : $0 }
                    ))
                    .frame(minHeight: 160)
                } header: {
                    Text("A note for them")
                } footer: {
                    Text("Shown when they unlock your legacy, in your own words. Your AI also knows who it's talking to and will speak to them the way you would.")
                }
            }
            .brandBackground()
            .navigationTitle(person.name.isEmpty ? "Add someone" : person.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if let i = store.archive.legacy.beneficiaries.firstIndex(where: { $0.id == person.id }) {
                            store.archive.legacy.beneficiaries[i] = person
                        } else {
                            store.archive.legacy.beneficiaries.append(person)
                        }
                        // Every recipient should also be in the people list, so the AI knows them.
                        if store.person(forBeneficiary: person.id) == nil {
                            if let i = store.archive.people.firstIndex(where: { $0.beneficiaryId == nil && $0.name.caseInsensitiveCompare(person.name) == .orderedSame }) {
                                store.archive.people[i].beneficiaryId = person.id
                            } else {
                                store.upsert(Person(name: person.name, relationship: person.relationship, beneficiaryId: person.id))
                            }
                        }
                        dismiss()
                    }
                    .disabled(person.name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
