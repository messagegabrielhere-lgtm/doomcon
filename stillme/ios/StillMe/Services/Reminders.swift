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
            (ids[0], soon, "Your Still Me check-in is due in 3 days. Tap to let it know you're still here."),
            (ids[1], due, "Your Still Me check-in is due today. If you don't check in, your legacy process begins after the grace period."),
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
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ids)
        center.removePendingNotificationRequests(withIdentifiers: (0..<7).map { "question-\($0)" })
    }

    static func cancelDailyQuestions() {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: (0..<7).map { "question-\($0)" })
    }

    /// One unanswered interview question each evening for the next week. A
    /// little each day is how an archive gets deep enough to sound like you.
    static func scheduleDailyQuestions(from unanswered: [String], hour: Int = 19) async {
        let center = UNUserNotificationCenter.current()
        let ids = (0..<7).map { "question-\($0)" }
        center.removePendingNotificationRequests(withIdentifiers: ids)
        guard !unanswered.isEmpty,
              (try? await center.requestAuthorization(options: [.alert, .sound])) == true else { return }
        let picks = unanswered.shuffled()
        for day in 0..<7 {
            guard let date = Calendar.current.date(byAdding: .day, value: day + 1, to: .now) else { continue }
            var parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
            parts.hour = hour
            let content = UNMutableNotificationContent()
            content.title = "Today's question"
            content.body = picks[day % picks.count]
            let trigger = UNCalendarNotificationTrigger(dateMatching: parts, repeats: false)
            try? await center.add(UNNotificationRequest(identifier: ids[day], content: content, trigger: trigger))
        }
    }
}
