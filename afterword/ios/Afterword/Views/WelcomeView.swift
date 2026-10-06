import SwiftUI

struct WelcomeView: View {
    @Binding var mode: AppMode
    @State private var path: [Step] = []

    enum Step: Hashable { case consent, redeem }

    var body: some View {
        NavigationStack(path: $path) {
            VStack(spacing: 28) {
                Spacer()
                Image(systemName: "text.bubble")
                    .font(.system(size: 64, weight: .light))
                    .foregroundStyle(.tint)
                VStack(spacing: 10) {
                    Text("Afterword")
                        .font(.largeTitle.weight(.semibold))
                    Text("Record your stories, your voice and your way of seeing things, so the people you love can keep talking with you.")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(spacing: 12) {
                    Button { path.append(.consent) } label: {
                        Text("Preserve myself").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    Button { path.append(.redeem) } label: {
                        Text("I received an access code").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .controlSize(.large)
            }
            .padding(24)
            .navigationDestination(for: Step.self) { step in
                switch step {
                case .consent: ConsentView { mode = .owner }
                case .redeem: RedeemView { mode = .recipient }
                }
            }
        }
    }
}

/// Explicit consent before any personal data leaves the device
/// (App Store Review Guideline 5.1.2 on sharing data with third-party AI).
struct ConsentView: View {
    var onAccept: () -> Void
    @State private var understandsAI = false
    @State private var agreesToProcessing = false
    @State private var understandsSwitch = false

    var body: some View {
        Form {
            Section {
                Text("Before you start, here's exactly what Afterword does with what you share.")
            }
            Section("How it works") {
                point("square.and.pencil", "You answer questions, tell stories, and paste things you've written. It stays on this phone and is backed up to the Afterword server.")
                point("bubble.left.and.bubble.right", "To create replies in your voice, your archive and each conversation are sent to Anthropic's Claude AI. Under Anthropic's commercial API terms, it isn't used to train their models.")
                point("clock.badge.checkmark", "You check in from time to time. If you stop, we remind you, then ask the person you trust to confirm before anything is shared.")
                point("envelope", "Only the people you choose receive a private access code. You can revoke a release, export, or delete everything at any time.")
            }
            Section("Please confirm") {
                Toggle("I understand the people I choose will talk with an AI built from what I share, not with me.", isOn: $understandsAI)
                Toggle("I agree to my archive and conversations being sent to Afterword's server and to Anthropic to generate replies.", isOn: $agreesToProcessing)
                Toggle("I understand that if I stop checking in and my executor confirms, my archive is shared with the people I chose.", isOn: $understandsSwitch)
            }
            .font(.callout)
            Section {
                Button("Begin", action: onAccept)
                    .frame(maxWidth: .infinity)
                    .disabled(!(understandsAI && agreesToProcessing && understandsSwitch))
            }
        }
        .navigationTitle("Your consent")
    }

    private func point(_ symbol: String, _ text: String) -> some View {
        Label { Text(text).font(.callout) } icon: { Image(systemName: symbol).foregroundStyle(.tint) }
    }
}
