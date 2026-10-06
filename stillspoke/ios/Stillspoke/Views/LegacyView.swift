import SwiftUI

/// Who receives your legacy, who confirms your death, and the check-in clock.
struct LegacyView: View {
    @Environment(ArchiveStore.self) private var store
    @State private var editing: Beneficiary?
    @State private var confirmRevoke = false

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            Form {
                statusSection

                Section {
                    ForEach(store.archive.legacy.beneficiaries) { person in
                        Button { editing = person } label: {
                            LabeledContent(person.name, value: person.relationship)
                        }
                        .foregroundStyle(.primary)
                    }
                    .onDelete { store.archive.legacy.beneficiaries.remove(atOffsets: $0) }
                    Button("Add someone", systemImage: "person.badge.plus") {
                        editing = Beneficiary()
                    }
                } header: {
                    Text("Who receives it")
                } footer: {
                    Text("Each person gets their own private access code by email, with an optional note from you.")
                }

                Section {
                    TextField("Name", text: executorBinding(\.name))
                        .textContentType(.name)
                    TextField("Email", text: executorBinding(\.email))
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("Executor")
                } footer: {
                    Text("Someone you trust to confirm you've died. Nothing is shared until they do. Without an executor, your legacy is released automatically after a second grace period, so we strongly recommend one.")
                }

                Section {
                    Stepper("Check in every \(store.archive.legacy.checkInIntervalDays) days",
                            value: $store.archive.legacy.checkInIntervalDays, in: 7...365, step: 7)
                    Stepper("Grace period \(store.archive.legacy.graceDays) days",
                            value: $store.archive.legacy.graceDays, in: 3...90)
                    TextField("Your email for reminders", text: Binding(
                        get: { store.archive.legacy.ownerEmail ?? "" },
                        set: { store.archive.legacy.ownerEmail = $0.isEmpty ? nil : $0 }
                    ))
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                } header: {
                    Text("Check-ins")
                } footer: {
                    Text("If you miss a check-in, we remind you and wait out the grace period before contacting your executor.")
                }
            }
            .navigationTitle("Legacy")
            .refreshable { await store.refreshStatus() }
            .task { await store.refreshStatus() }
            .sheet(item: $editing) { person in
                BeneficiaryEditor(person: person)
            }
            .confirmationDialog("You're alive?", isPresented: $confirmRevoke) {
                Button("Revoke release and void all codes", role: .destructive) {
                    Task { await store.revokeRelease() }
                }
            } message: {
                Text("Everyone's access code will stop working and your check-in clock restarts.")
            }
        }
    }

    @ViewBuilder private var statusSection: some View {
        Section {
            if let status = store.status {
                switch status.status {
                case .active:
                    if let due = status.nextCheckInDue {
                        LabeledContent("Next check-in", value: due.formatted(date: .abbreviated, time: .omitted))
                    }
                case .overdue:
                    Label("Check-in overdue", systemImage: "exclamationmark.triangle.fill").foregroundStyle(.orange)
                case .awaitingExecutor:
                    Label("Your executor has been asked to confirm", systemImage: "exclamationmark.octagon.fill").foregroundStyle(.red)
                case .released:
                    Label("Your legacy has been released", systemImage: "envelope.open.fill").foregroundStyle(.red)
                }
                if let backup = status.archiveUpdatedAt {
                    LabeledContent("Last backup", value: backup.formatted(.relative(presentation: .named)))
                }
            }

            if store.status?.status == .released {
                Button("I'm alive — revoke release", role: .destructive) { confirmRevoke = true }
            } else {
                Button {
                    Task {
                        await store.checkIn()
                        if let due = store.status?.nextCheckInDue { await Reminders.schedule(due: due) }
                        if store.lastError == nil { await store.sync() }
                    }
                } label: {
                    Label("I'm still here", systemImage: "hand.wave.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(store.isSyncing)
            }

            if store.isSyncing { ProgressView() }
            if let error = store.lastError {
                Text(error).font(.footnote).foregroundStyle(.red)
            }
        } footer: {
            Text("Checking in also backs up your latest memories. Opening the app doesn't count, in case someone else opens your phone.")
        }
    }

    private func executorBinding(_ field: WritableKeyPath<Executor, String>) -> Binding<String> {
        Binding(
            get: { store.archive.legacy.executor?[keyPath: field] ?? "" },
            set: { value in
                var executor = store.archive.legacy.executor ?? Executor(name: "", email: "")
                executor[keyPath: field] = value
                store.archive.legacy.executor = executor.name.isEmpty && executor.email.isEmpty ? nil : executor
            }
        )
    }
}

struct BeneficiaryEditor: View {
    @State var person: Beneficiary
    @Environment(ArchiveStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private var isValid: Bool {
        !person.name.trimmingCharacters(in: .whitespaces).isEmpty
            && person.email.contains("@") && person.email.contains(".")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $person.name).textContentType(.name)
                    TextField("Email", text: $person.email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
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
                    Text("Sent with their access code, in your own words. Your AI also knows who it's talking to and will speak to them the way you would.")
                }
            }
            .navigationTitle(person.name.isEmpty ? "Add someone" : person.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        person.email = person.email.trimmingCharacters(in: .whitespaces)
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
                    .disabled(!isValid)
                }
            }
        }
    }
}
