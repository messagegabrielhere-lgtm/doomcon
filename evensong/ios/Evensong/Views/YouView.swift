import SwiftUI
import UniformTypeIdentifiers

/// Your basic facts, how you talk, standing instructions to your AI, and settings.
struct YouView: View {
    @Environment(ArchiveStore.self) private var store
    @AppStorage("mode") private var mode: AppMode = .owner
    @AppStorage(APIClient.serverURLKey) private var serverURL = ""
    @AppStorage("dailyQuestions") private var dailyQuestions = false
    @State private var confirmDelete = false

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            Form {
                Section("About you") {
                    TextField("Full name", text: $store.archive.profile.name).textContentType(.name)
                    TextField("What people call you", text: optional($store.archive.profile.preferredName))
                    TextField("Hometown", text: optional($store.archive.profile.hometown))
                    TextField("Birth year", value: $store.archive.profile.birthYear, format: .number.grouping(.never))
                        .keyboardType(.numberPad)
                }

                longText("How you talk", $store.archive.profile.speakingStyle,
                         "Phrases you use, how you joke, whether you swear, how you sign off, what you call people.")
                longText("Instructions to your AI", $store.archive.profile.instructions,
                         "Things it should always do or say. \u{201C}Remind my kids I was proud of them.\u{201D} \u{201C}Never pretend to be alive.\u{201D}")
                longText("Off limits", $store.archive.profile.boundaries,
                         "Topics it should gently decline, like old conflicts or private matters.")

                Section {
                    Toggle("A question every evening", isOn: $dailyQuestions)
                } footer: {
                    Text("A notification at 7pm with one interview question you haven't answered yet.")
                }
                .onChange(of: dailyQuestions) { _, on in
                    if !on { Reminders.cancelDailyQuestions() }
                }

                Section {
                    ShareLink(item: ArchiveExport(archive: store.archive),
                              preview: SharePreview("Evensong archive", image: Image(systemName: "doc.text"))) {
                        Label("Export my archive", systemImage: "square.and.arrow.up")
                    }
                    TextField("Server URL", text: $serverURL, prompt: Text(APIClient.baseURL.absoluteString))
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("Your data")
                } footer: {
                    Text("The export is a JSON file of everything you've recorded.")
                }

                Section {
                    Button("Delete everything", role: .destructive) { confirmDelete = true }
                } footer: {
                    if let error = store.lastError { Text(error).foregroundStyle(.red) }
                }
            }
            .brandBackground()
            .navigationTitle(store.archive.profile.displayName)
            .confirmationDialog("Delete everything?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete from this phone and the server", role: .destructive) {
                    Task {
                        if await store.deleteEverything() {
                            Reminders.cancel()
                            mode = .none
                        }
                    }
                }
            } message: {
                Text("Your memories, your AI and your legacy settings will be permanently erased. No one will receive anything.")
            }
        }
    }

    private func longText(_ title: String, _ text: Binding<String>, _ hint: String) -> some View {
        Section {
            TextEditor(text: text).frame(minHeight: 100)
        } header: {
            Text(title)
        } footer: {
            Text(hint)
        }
    }

    private func optional(_ binding: Binding<String?>) -> Binding<String> {
        Binding(get: { binding.wrappedValue ?? "" }, set: { binding.wrappedValue = $0.isEmpty ? nil : $0 })
    }
}

struct ArchiveExport: Transferable {
    let archive: Archive

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .json) { export in
            let encoder = JSONEncoder.evensong
            return try encoder.encode(export.archive)
        }
        .suggestedFileName("evensong-archive.json")
    }
}
