import SwiftUI

@main
struct UnlistedApp: App {
    @State private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
        }
    }
}

struct RootView: View {
    @Environment(AppStore.self) private var store
    @State private var showOnboarding = false

    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Home", systemImage: "house") }
            ScanView()
                .tabItem { Label("Scan", systemImage: "magnifyingglass") }
            RemoveView()
                .tabItem { Label("Remove", systemImage: "eraser") }
            LettersView()
                .tabItem { Label("Letters", systemImage: "envelope") }
            ProtectView()
                .tabItem { Label("Protect", systemImage: "lock.shield") }
        }
        .onAppear { showOnboarding = store.me == nil }
        .sheet(isPresented: $showOnboarding) {
            OnboardingView { showOnboarding = false }
                .interactiveDismissDisabled()
        }
    }
}
