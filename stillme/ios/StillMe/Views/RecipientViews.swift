import SwiftUI
import UniformTypeIdentifiers

/// Opening a sealed legacy file someone left you.
struct UnlockView: View {
    var onUnlocked: () -> Void
    @Environment(RecipientStore.self) private var recipient
    @State private var choosingFile = false
    @State private var code = ""
    @State private var working = false
    @State private var error: String?

    private var sealed: SealedLegacy? {
        recipient.pendingFile.flatMap { try? LegacySeal.peek($0) }
    }

    var body: some View {
        Form {
            if let sealed {
                Section {
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("From \(sealed.fromName)").font(.headline).foregroundStyle(Color.ink)
                            Text("For \(sealed.forName)").foregroundStyle(Color.slate)
                        }
                    } icon: {
                        Image(systemName: "lock.doc.fill").foregroundStyle(Color.pulse)
                    }
                    Button("Choose a different file") { choosingFile = true }
                        .font(.footnote)
                }
                Section {
                    TextField("XXXX-XXXX-XXXX-XXXX", text: $code)
                        .font(.title3.monospaced())
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                } header: {
                    Text("Unlock code")
                } footer: {
                    Text("\(sealed.fromName) left this code separately, often in their will or with someone they trusted.")
                }
                Section {
                    Button {
                        Task { await unlock() }
                    } label: {
                        if working { ProgressView() } else { Text("Unlock") }
                    }
                    .disabled(LegacySeal.normalize(code).count < 16 || working)
                }
            } else {
                Section {
                    Button("Choose the legacy file", systemImage: "folder") { choosingFile = true }
                } footer: {
                    Text("It ends in .stillme. You can also tap the file in Messages, Mail or Files and choose Still Me.")
                }
            }
            if let error {
                Text(error).foregroundStyle(.red)
            }
        }
        .brandBackground()
        .navigationTitle("Open a legacy")
        .fileImporter(isPresented: $choosingFile, allowedContentTypes: [.stillMeLegacy, .json, .data]) { result in
            error = nil
            do {
                let url = try result.get()
                let access = url.startAccessingSecurityScopedResource()
                defer { if access { url.stopAccessingSecurityScopedResource() } }
                let data = try Data(contentsOf: url)
                _ = try LegacySeal.peek(data)
                recipient.pendingFile = data
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    private func unlock() async {
        guard let data = recipient.pendingFile else { return }
        working = true
        defer { working = false }
        do {
            try await recipient.unlock(data, code: code)
            onUnlocked()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct RecipientHome: View {
    @Binding var mode: AppMode
    @Environment(RecipientStore.self) private var recipient
    @State private var showIntro = LaunchScreen.value == "intro"
    @State private var confirmForget = false

    var body: some View {
        @Bindable var recipient = recipient
        NavigationStack {
            if let package = recipient.package, recipient.pendingFile == nil {
                let name = package.ownerName
                ChatView(
                    messages: $recipient.conversation,
                    personaName: name,
                    send: { recipient.chat($0) },
                    onChange: { recipient.saveConversation() },
                    intro: PersonaEngine.unavailableReason ?? "Say anything. Take your time.",
                    suggestions: ["Tell me a story about you.", "What were you like at my age?",
                                  "What would you tell me on a hard day?", "I miss you."]
                )
                .safeAreaInset(edge: .top) {
                    Text("An AI built from what \(name) chose to share. Not \(name).")
                        .font(.caption)
                        .foregroundStyle(Color.slate)
                        .frame(maxWidth: .infinity)
                        .padding(8)
                        .background(.bar)
                }
                .brandBackground()
                .navigationTitle(name)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    Menu {
                        Button("Their note to you", systemImage: "envelope.open") { showIntro = true }
                        Button("Remove from this phone", systemImage: "trash", role: .destructive) { confirmForget = true }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
                .sheet(isPresented: $showIntro) { IntroSheet(package: package) }
                .onAppear { if recipient.conversation.isEmpty { showIntro = true } }
                .confirmationDialog("Remove from this phone?", isPresented: $confirmForget, titleVisibility: .visible) {
                    Button("Remove", role: .destructive) {
                        recipient.forget()
                        mode = .none
                    }
                } message: {
                    Text("Your conversation is erased. You can open the file again later with its code.")
                }
            } else {
                UnlockView {}
            }
        }
    }
}

private struct IntroSheet: View {
    let package: LegacyPackage
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        let name = package.ownerName
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    PulseMark().frame(width: 64)
                    Text("Dear \(package.recipient.name.split(separator: " ").first.map(String.init) ?? package.recipient.name),")
                        .font(.title2.weight(.bold))
                    if let note = package.recipient.personalNote {
                        Text(note).font(.body)
                        Text("— \(name)").foregroundStyle(Color.slate)
                    }
                    Divider()
                    Text("Before \(name) died, they recorded their stories and way of speaking so you could keep talking with them. What you'll talk with is an AI built from those memories. It runs only on this iPhone. It can be a comfort, and it can also get things wrong or not know something.")
                    Text("Go at your own pace. If it ever feels like too much, it's okay to close the app and reach out to someone you love.")
                        .foregroundStyle(Color.slate)
                }
                .padding(24)
            }
            .background(Color.canvas.ignoresSafeArea())
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Begin") { dismiss() } }
            }
        }
    }
}
