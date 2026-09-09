import { useEffect } from "react";
import { isDueSoon, notifyReminder } from "../lib/notifications";
import type { Reminder } from "../types";

/** Vérifie périodiquement (tant que l'app est ouverte) les rappels arrivant à
 * échéance et déclenche une notification locale une seule fois par échéance. */
export function useReminderNotifications(
  reminders: Reminder[],
  markNotified: (r: Reminder) => Promise<void>,
) {
  useEffect(() => {
    const check = () => {
      for (const r of reminders) {
        if (isDueSoon(r) && r.lastNotifiedFor !== r.dueDate) {
          notifyReminder(r);
          markNotified(r);
        }
      }
    };
    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders]);
}
