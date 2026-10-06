import SwiftUI

@main
struct StillMeApp: App {
    @State private var archive: ArchiveStore
    @State private var recipient: RecipientStore

    init() {
        Theme.configureAppearance()
        let archive = ArchiveStore()
        let recipient = RecipientStore()
        #if DEBUG
        // Launch with `-StillMeDemo 1` to fill the app with sample data
        // (used by CI to take screenshots).
        if UserDefaults.standard.bool(forKey: "StillMeDemo") {
            DemoData.seed(archive: archive, recipient: recipient)
        }
        #endif
        _archive = State(initialValue: archive)
        _recipient = State(initialValue: recipient)
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .tint(Color.pulse)
                .environment(archive)
                .environment(recipient)
        }
    }
}

/// `-StillMeScreen <name>` opens a specific screen at launch (used for screenshots).
enum LaunchScreen {
    static let value = UserDefaults.standard.string(forKey: "StillMeScreen")
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
    // `-StillMeTab N` opens a specific tab (used for screenshots).
    @State private var tab = UserDefaults.standard.integer(forKey: "StillMeTab")

    var body: some View {
        TabView(selection: $tab) {
            InterviewView()
                .tabItem { Label("Record", systemImage: "mic") }
                .tag(0)
            MemoriesView()
                .tabItem { Label("Memories", systemImage: "books.vertical") }
                .tag(1)
            RehearseView()
                .tabItem { Label("Rehearse", systemImage: "bubble.left.and.bubble.right") }
                .tag(2)
            LegacyView()
                .tabItem { Label("Legacy", systemImage: "envelope.badge.shield.half.filled") }
                .tag(3)
            YouView()
                .tabItem { Label("You", systemImage: "person.crop.circle") }
                .tag(4)
        }
    }
}
