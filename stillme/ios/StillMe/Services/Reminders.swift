import Foundation
import UserNotifications

/// The optional "question of the day" notification.
enum Reminders {
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
