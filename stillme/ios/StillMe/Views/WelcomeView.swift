import SwiftUI

struct WelcomeView: View {
    @Binding var mode: AppMode
    @State private var path: [Step] = LaunchScreen.value == "consent" ? [.consent] : []

    enum Step: Hashable { case consent, redeem }

    private func step(_ symbol: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(Color.pulse)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline).foregroundStyle(Color.ink)
                Text(detail).font(.subheadline).foregroundStyle(Color.slate)
            }
        }
    }

    var body: some View {
        NavigationStack(path: $path) {
            VStack(alignment: .leading, spacing: 0) {
                Spacer()
                PulseMark().frame(width: 84)
                Text("Still Me")
                    .font(.system(size: 52, weight: .heavy))
                    .foregroundStyle(Color.ink)
                    .padding(.top, 18)
                Text("Still me. Still here for them.")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(Color.pulse)
                    .padding(.top, 4)
                VStack(alignment: .leading, spacing: 14) {
                    step("mic.fill", "Record yourself now", "Answer questions, tell your stories, show how you text.")
                    step("person.2.fill", "Choose who gets you", "Pick the people who can talk with you later.")
                    step("bubble.left.and.text.bubble.right.fill", "They can talk with you", "After you die, they chat with an AI of you, built only from what you recorded.")
                }
                .padding(.top, 32)
                Spacer()
                VStack(spacing: 12) {
                    Button { path.append(.consent) } label: {
                        Text("Start recording me")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                    }
                    .buttonStyle(.borderedProminent)
                    .foregroundStyle(Color.onAccent)
                    Button { path.append(.redeem) } label: {
                        Text("Someone left me an access code")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                    }
                    .buttonStyle(.bordered)
                    .tint(Color.ink)
                }
                .controlSize(.large)
            }
            .padding(24)
            .background(Color.canvas.ignoresSafeArea())
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
                Text("Before you start, here's exactly what Still Me does with what you share.")
            }
            Section("How it works") {
                point("square.and.pencil", "You answer questions, tell stories, and paste things you've written. It stays on this phone and is backed up to the Still Me server.")
                point("bubble.left.and.bubble.right", "To create replies in your voice, your archive and each conversation are sent to Anthropic's Claude AI. Under Anthropic's commercial API terms, it isn't used to train their models.")
                point("clock.badge.checkmark", "You check in from time to time. If you stop, we remind you, then ask the person you trust to confirm before anything is shared.")
                point("envelope", "Only the people you choose receive a private access code. You can revoke a release, export, or delete everything at any time.")
            }
            Section("Please confirm") {
                Toggle("I understand the people I choose will talk with an AI built from what I share, not with me.", isOn: $understandsAI)
                Toggle("I agree to my archive and conversations being sent to Still Me's server and to Anthropic to generate replies.", isOn: $agreesToProcessing)
                Toggle("I understand that if I stop checking in and my executor confirms, my archive is shared with the people I chose.", isOn: $understandsSwitch)
            }
            .font(.callout)
            Section {
                Button("Begin", action: onAccept)
                    .frame(maxWidth: .infinity)
                    .disabled(!(understandsAI && agreesToProcessing && understandsSwitch))
            }
        }
        .brandBackground()
        .navigationTitle("Your consent")
    }

    private func point(_ symbol: String, _ text: String) -> some View {
        Label { Text(text).font(.callout) } icon: { Image(systemName: symbol).foregroundStyle(.tint) }
    }
}
