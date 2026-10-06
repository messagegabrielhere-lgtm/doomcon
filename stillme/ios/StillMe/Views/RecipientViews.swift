import SwiftUI

/// Entering the access code someone left you.
struct RedeemView: View {
    var onRedeemed: () -> Void
    @Environment(RecipientStore.self) private var recipient
    @State private var code = ""
    @State private var working = false
    @State private var error: String?

    var body: some View {
        Form {
            Section {
                TextField("XXXX-XXXX-XXXX-XXXX", text: $code)
                    .font(.title3.monospaced())
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
            } header: {
                Text("Access code")
            } footer: {
                Text("You'll find it in the email you received.")
            }
            Section {
                Button {
                    Task { await redeem() }
                } label: {
                    if working { ProgressView() } else { Text("Continue") }
                }
                .disabled(code.filter { $0.isLetter || $0.isNumber }.count < 16 || working)
                if let error { Text(error).foregroundStyle(.red) }
            }
        }
        .brandBackground()
        .navigationTitle("Access code")
    }

    private func redeem() async {
        working = true
        defer { working = false }
        do {
            try await recipient.redeem(code)
            onRedeemed()
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
            if let grant = recipient.grant {
                ChatView(
                    messages: $recipient.conversation,
                    personaName: grant.name,
                    send: { recipient.chat($0) },
                    onChange: { recipient.saveConversation() },
                    intro: "Say anything. Take your time.",
                    suggestions: ["Tell me a story about you.", "What were you like at my age?",
                                  "What would you tell me on a hard day?", "I miss you."]
                )
                .safeAreaInset(edge: .top) {
                    Text("An AI built from what \(grant.name) chose to share — not \(grant.name).")
                        .font(.caption)
                        .foregroundStyle(Color.slate)
                        .frame(maxWidth: .infinity)
                        .padding(8)
                        .background(.bar)
                }
                .brandBackground()
                .navigationTitle(grant.name)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    Menu {
                        Button("Their note to you", systemImage: "envelope.open") { showIntro = true }
                        Button("Remove from this phone", systemImage: "trash", role: .destructive) { confirmForget = true }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
                .sheet(isPresented: $showIntro) { IntroSheet(grant: grant) }
                .onAppear { if recipient.conversation.isEmpty { showIntro = true } }
                .confirmationDialog("Remove from this phone?", isPresented: $confirmForget, titleVisibility: .visible) {
                    Button("Remove", role: .destructive) {
                        recipient.forget()
                        mode = .none
                    }
                } message: {
                    Text("Your conversation is erased. You can enter the access code again later.")
                }
            } else {
                RedeemView {}
            }
        }
    }
}

private struct IntroSheet: View {
    let grant: LegacyGrant
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    PulseMark().frame(width: 64)
                    Text("Dear \(grant.beneficiaryName),")
                        .font(.title2.weight(.bold))
                    if let note = grant.personalNote {
                        Text(note).font(.body)
                        Text("— \(grant.name)").foregroundStyle(Color.slate)
                    }
                    Divider()
                    Text("Before \(grant.name) died, they recorded their stories and way of speaking so you could keep talking with them. What you'll talk with is an AI built from those memories. It can be a comfort, and it can also get things wrong or not know something.")
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
