import SwiftUI
import UIKit

// Still Me's look: clear and human. Warm white and deep ink with one accent,
// Pulse, used sparingly. Colors live in Assets.xcassets with light/dark
// variants; type is SF Pro, set bold for headlines. See BRAND.md.

extension Color {
    static let pulse = Color("Pulse")
    static let canvas = Color("Canvas")
    static let card = Color("Card")
    static let ink = Color("Ink")
    static let slate = Color("Slate")
    static let onAccent = Color("OnAccent")
}

enum Theme {
    /// Heavy navigation titles in ink, set once at launch.
    static func configureAppearance() {
        let ink = UIColor(named: "Ink") ?? .label
        let large = UIFont.systemFont(ofSize: UIFont.preferredFont(forTextStyle: .largeTitle).pointSize, weight: .heavy)
        let inline = UIFont.systemFont(ofSize: UIFont.preferredFont(forTextStyle: .headline).pointSize, weight: .bold)
        let nav = UINavigationBar.appearance()
        nav.largeTitleTextAttributes = [.font: UIFontMetrics(forTextStyle: .largeTitle).scaledFont(for: large), .foregroundColor: ink]
        nav.titleTextAttributes = [.font: UIFontMetrics(forTextStyle: .headline).scaledFont(for: inline), .foregroundColor: ink]
    }
}

extension View {
    /// Warm white by day, near-black by night, behind lists and forms.
    func brandBackground() -> some View {
        scrollContentBackground(.hidden)
            .background(Color.canvas.ignoresSafeArea())
    }
}

/// The Still Me mark: a speech bubble with a heartbeat running through it.
/// A voice that keeps going.
struct PulseMark: View {
    var bubble = Color.pulse
    var line = Color.onAccent

    var body: some View {
        Canvas { context, size in
            let s = min(size.width, size.height) / 100
            func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x * s, y: y * s) }

            var shape = Path(roundedRect: CGRect(x: 8 * s, y: 14 * s, width: 84 * s, height: 58 * s),
                             cornerRadius: 22 * s, style: .continuous)
            shape.move(to: p(24, 70))
            shape.addLine(to: p(17, 89))
            shape.addLine(to: p(42, 70))
            shape.closeSubpath()
            context.fill(shape, with: .color(bubble))

            var beat = Path()
            beat.move(to: p(19, 44))
            for point in [p(36, 44), p(43, 29), p(52, 60), p(59, 36), p(64, 44), p(81, 44)] {
                beat.addLine(to: point)
            }
            context.stroke(beat, with: .color(line),
                           style: StrokeStyle(lineWidth: 6.5 * s, lineCap: .round, lineJoin: .round))
        }
        .aspectRatio(1, contentMode: .fit)
        .accessibilityHidden(true)
    }
}
