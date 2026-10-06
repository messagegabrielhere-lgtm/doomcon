import Foundation
import UserNotifications

/// Local reminders before a check-in is due, so a missed check-in is never a surprise.
enum Reminders {
    private static let ids = ["checkin-soon", "checkin-due"]

    static func schedule(due: Date) async {
        let center = UNUserNotificationCenter.current()
        guard (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) == true else { return }
        center.removePendingNotificationRequests(withIdentifiers: ids)

        let soon = due.addingTimeInterval(-3 * 86_400)
        let plans: [(String, Date, String)] = [
            (ids[0], soon, "Your Afterword check-in is due in 3 days. Tap to let it know you're still here."),
            (ids[1], due, "Your Afterword check-in is due today. If you don't check in, your legacy process begins after the grace period."),
        ]
        for (id, date, body) in plans where date > .now {
            let content = UNMutableNotificationContent()
            content.title = "Still here?"
            content.body = body
            content.sound = .default
            let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: date)
            let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
            try? await center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        }
    }

    static func cancel() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ids)
    }
}
