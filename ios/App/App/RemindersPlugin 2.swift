import Capacitor
import EventKit

@objc(RemindersPlugin)
public class RemindersPlugin: CAPPlugin {
    private let store = EKEventStore()
    private let listName = "Our Kitchen"

    @objc func requestPermission(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            store.requestFullAccessToReminders { granted, _ in
                call.resolve(["granted": granted])
            }
        } else {
            store.requestAccess(to: .reminder) { granted, _ in
                call.resolve(["granted": granted])
            }
        }
    }

    private func getOrCreateList() -> EKCalendar? {
        if let existing = store.calendars(for: .reminder).first(where: { $0.title == listName }) {
            return existing
        }
        guard let source = store.defaultCalendarForNewReminders()?.source else { return nil }
        let list = EKCalendar(for: .reminder, eventStore: store)
        list.title = listName
        list.source = source
        try? store.saveCalendar(list, commit: true)
        return list
    }

    @objc func syncItems(_ call: CAPPluginCall) {
        guard let items = call.getArray("items") as? [[String: Any]] else {
            call.reject("Invalid items")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            guard let list = self.getOrCreateList() else {
                call.reject("Could not access reminders list")
                return
            }

            let group = DispatchGroup()
            var existingReminders: [EKReminder] = []

            group.enter()
            let predicate = self.store.predicateForReminders(in: [list])
            self.store.fetchReminders(matching: predicate) { reminders in
                existingReminders = reminders ?? []
                group.leave()
            }
            group.wait()

            let incomingIds = Set(items.compactMap { $0["id"] as? String })

            for item in items {
                guard let id = item["id"] as? String,
                      let title = item["title"] as? String,
                      let completed = item["completed"] as? Bool else { continue }
                let tag = "kitchen:\(id)"
                if let reminder = existingReminders.first(where: { $0.notes?.contains(tag) == true }) {
                    if reminder.isCompleted != completed {
                        reminder.isCompleted = completed
                        try? self.store.save(reminder, commit: false)
                    }
                } else {
                    let reminder = EKReminder(eventStore: self.store)
                    reminder.title = title
                    reminder.notes = tag
                    reminder.isCompleted = completed
                    reminder.calendar = list
                    try? self.store.save(reminder, commit: false)
                }
            }

            // Remove reminders that have been deleted from the app
            for reminder in existingReminders {
                guard let notes = reminder.notes, notes.hasPrefix("kitchen:") else { continue }
                let reminderId = String(notes.dropFirst("kitchen:".count))
                if !incomingIds.contains(reminderId) {
                    try? self.store.remove(reminder, commit: false)
                }
            }

            try? self.store.commit()
            call.resolve()
        }
    }

    @objc func getCompletions(_ call: CAPPluginCall) {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            guard let list = self.store.calendars(for: .reminder).first(where: { $0.title == self.listName }) else {
                call.resolve(["items": []])
                return
            }

            let group = DispatchGroup()
            var allReminders: [EKReminder] = []

            group.enter()
            let predicate = self.store.predicateForReminders(in: [list])
            self.store.fetchReminders(matching: predicate) { reminders in
                allReminders = reminders ?? []
                group.leave()
            }
            group.wait()

            let result: [[String: Any]] = allReminders.compactMap { reminder in
                guard let notes = reminder.notes, notes.hasPrefix("kitchen:") else { return nil }
                let id = String(notes.dropFirst("kitchen:".count))
                return ["id": id, "completed": reminder.isCompleted]
            }

            call.resolve(["items": result])
        }
    }
}
