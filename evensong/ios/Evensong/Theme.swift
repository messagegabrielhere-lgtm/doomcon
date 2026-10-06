import SwiftUI
import UIKit

// Evensong's look: dusk and lamplight. Colors live in Assets.xcassets with
// light/dark variants; headings use New York, Apple's built-in serif, so no
// font files need to be bundled. See BRAND.md.

extension Color {
    static let dusk = Color("Dusk")
    static let lamplight = Color("Lamplight")
    static let canvas = Color("Canvas")
    static let card = Color("Card")
    static let ink = Color("Ink")
    static let heather = Color("Heather")
    static let onAccent = Color("OnAccent")
}

enum Theme {
    /// Night-sky gradient used on the welcome screen and in the icon.
    static let duskGradient = LinearGradient(
        stops: [
            .init(color: Color(red: 0.09, green: 0.08, blue: 0.16), location: 0),
            .init(color: Color(red: 0.23, green: 0.21, blue: 0.40), location: 0.45),
            .init(color: Color(red: 0.48, green: 0.31, blue: 0.43), location: 0.72),
            .init(color: Color(red: 0.91, green: 0.63, blue: 0.33), location: 1),
        ],
        startPoint: .top, endPoint: .bottom
    )

    /// Serif navigation titles, set once at launch.
    static func configureAppearance() {
        func serif(_ style: UIFont.TextStyle, weight: UIFont.Weight) -> UIFont {
            let base = UIFont.preferredFont(forTextStyle: style)
            let weighted = base.fontDescriptor.addingAttributes([.traits: [UIFontDescriptor.TraitKey.weight: weight.rawValue]])
            let descriptor = weighted.withDesign(.serif) ?? weighted
            return UIFont(descriptor: descriptor, size: 0)
        }
        let nav = UINavigationBar.appearance()
        nav.largeTitleTextAttributes = [.font: serif(.largeTitle, weight: .semibold), .foregroundColor: UIColor(named: "Ink") ?? .label]
        nav.titleTextAttributes = [.font: serif(.headline, weight: .semibold), .foregroundColor: UIColor(named: "Ink") ?? .label]
    }
}

extension View {
    /// Parchment by day, night sky by night, behind lists and forms.
    func brandBackground() -> some View {
        scrollContentBackground(.hidden)
            .background(Color.canvas.ignoresSafeArea())
    }
}

/// The Evensong mark: a sun on the horizon whose lower edge becomes the tail of
/// a speech bubble, a voice that keeps speaking as the day ends.
struct HorizonMark: View {
    var sun = Color.lamplight
    var horizon = Color.lamplight

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let r = w * 0.32
            let cx = w / 2
            let horizonY = h * 0.62
            ZStack {
                // Sun: upper half above the horizon.
                Path { p in
                    p.addArc(center: CGPoint(x: cx, y: horizonY), radius: r,
                             startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
                    p.closeSubpath()
                }
                .fill(sun)
                .shadow(color: sun.opacity(0.6), radius: w * 0.08)
                // Bubble tail dipping below the horizon.
                Path { p in
                    p.move(to: CGPoint(x: cx - r * 0.55, y: horizonY))
                    p.addLine(to: CGPoint(x: cx - r * 0.78, y: horizonY + r * 0.55))
                    p.addLine(to: CGPoint(x: cx - r * 0.12, y: horizonY))
                    p.closeSubpath()
                }
                .fill(sun)
                // Horizon line.
                Capsule()
                    .fill(horizon.opacity(0.85))
                    .frame(width: w * 0.86, height: max(2, w * 0.022))
                    .position(x: cx, y: horizonY)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityHidden(true)
    }
}
