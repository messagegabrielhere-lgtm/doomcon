import SwiftUI

struct WelcomeView: View {
    @Binding var mode: AppMode
    @State private var path: [Step] = LaunchScreen.value == "consent" ? [.consent] : []

    enum Step: Hashable { case consent, unlock }

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
                    step("bubble.left.and.text.bubble.right.fill", "They can talk with you", "After you die, they open the file you left them and talk with an AI of you.")
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
                    Button { path.append(.unlock) } label: {
                        Text("Someone left me a legacy file")
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
                case .unlock: UnlockView { mode = .recipient }
                }
            }
        }
    }
}

/// What happens to what you record, agreed to before you start.
struct ConsentView: View {
    var onAccept: () -> Void
    @State private var understandsAI = false
    @State private var understandsCode = false

    var body: some View {
        Form {
            Section {
                Text("Before you start, here's exactly what Still Me does with what you record.")
            }
            Section("How it works") {
                point("iphone", "Everything you record stays on this iPhone. Still Me has no servers and no accounts, and nothing is uploaded.")
                point("sparkles", "Your AI runs on this iPhone with Apple Intelligence. Your words aren't sent to any AI company.")
                point("lock.doc", "For each person you choose, you seal a file they can open only with its code. You decide who gets the file and the code.")
                point("trash", "You can export or delete everything at any time.")
            }
            Section("Please confirm") {
                Toggle("I understand the people I choose will talk with an AI built from what I record, not with me.", isOn: $understandsAI)
                Toggle("I understand anyone with a sealed file and its code can open it, so I'll keep codes somewhere safe.", isOn: $understandsCode)
            }
            .font(.callout)
            Section {
                Button("Begin", action: onAccept)
                    .frame(maxWidth: .infinity)
                    .disabled(!(understandsAI && understandsCode))
            }
        }
        .brandBackground()
        .navigationTitle("Before you start")
    }

    private func point(_ symbol: String, _ text: String) -> some View {
        Label { Text(text).font(.callout) } icon: { Image(systemName: symbol).foregroundStyle(.tint) }
    }
}
