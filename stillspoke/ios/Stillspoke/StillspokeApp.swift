import SwiftUI

@main
struct StillspokeApp: App {
    @State private var archive = ArchiveStore()
    @State private var recipient = RecipientStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(archive)
                .environment(recipient)
        }
    }
}

enum AppMode: String {
    case none = "", owner, recipient
}

struct RootView: View {
    @AppStorage("mode") private var mode: AppMode = .none
    @Environment(ArchiveStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            switch mode {
            case .none: WelcomeView(mode: $mode)
            case .owner: OwnerTabs()
            case .recipient: RecipientHome(mode: $mode)
            }
        }
        .onChange(of: store.archive) { store.persist() }
        .onChange(of: scenePhase) { _, phase in
            // Back up quietly when leaving the app. This does not count as
            // "still here" on purpose: someone else may open a phone after you die.
            if phase == .background, mode == .owner {
                if store.hasAccount, store.needsSync { Task { await store.sync() } }
                if UserDefaults.standard.bool(forKey: "dailyQuestions") {
                    let unanswered = InterviewPrompts.allQuestions.filter { store.answers(to: $0).isEmpty }
                    Task { await Reminders.scheduleDailyQuestions(from: unanswered) }
                }
            }
        }
    }
}

struct OwnerTabs: View {
    var body: some View {
        TabView {
            InterviewView()
                .tabItem { Label("Record", systemImage: "mic") }
            MemoriesView()
                .tabItem { Label("Memories", systemImage: "books.vertical") }
            RehearseView()
                .tabItem { Label("Rehearse", systemImage: "bubble.left.and.bubble.right") }
            LegacyView()
                .tabItem { Label("Legacy", systemImage: "envelope.badge.shield.half.filled") }
            YouView()
                .tabItem { Label("You", systemImage: "person.crop.circle") }
        }
    }
}
