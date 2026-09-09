import type { Reminder } from "../types";
import { REMINDER_LABELS } from "../types";

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "denied";
  if (Notification.permission === "default") {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

export function daysUntil(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function isDueSoon(reminder: Reminder): boolean {
  if (reminder.done) return false;
  return daysUntil(reminder.dueDate) <= 2;
}

export function isOverdue(reminder: Reminder): boolean {
  if (reminder.done) return false;
  return daysUntil(reminder.dueDate) < 0;
}

export async function notifyReminder(reminder: Reminder): Promise<void> {
  if (!isSupported() || Notification.permission !== "granted") return;
  const label = REMINDER_LABELS[reminder.type];
  const body =
    daysUntil(reminder.dueDate) < 0
      ? `${label} en retard : ${reminder.title}`
      : `${label} aujourd'hui ou bientôt : ${reminder.title}`;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification("Carnet MICI", { body, tag: reminder.id });
      return;
    }
  } catch {
    // fall through to plain Notification
  }
  new Notification("Carnet MICI", { body, tag: reminder.id });
}
