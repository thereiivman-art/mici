import { useCallback, useEffect, useState } from "react";
import { decryptJSON, encryptJSON } from "../lib/crypto";
import { deleteRecord, getAllRecords, putRecord } from "../lib/db";
import { useVault } from "../lib/VaultContext";
import type { Reminder } from "../types";

export function useReminders() {
  const { key } = useVault();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    const records = await getAllRecords("reminders");
    const decrypted = await Promise.all(
      records.map((r) => decryptJSON<Reminder>(key, r.payload)),
    );
    decrypted.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    setReminders(decrypted);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (reminder: Reminder) => {
      if (!key) return;
      const payload = await encryptJSON(key, reminder);
      await putRecord("reminders", reminder.id, payload);
      await reload();
    },
    [key, reload],
  );

  const addReminder = useCallback(
    async (reminder: Omit<Reminder, "id" | "createdAt" | "done" | "lastNotifiedFor">) => {
      const full: Reminder = {
        ...reminder,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        done: false,
        lastNotifiedFor: null,
      };
      await save(full);
    },
    [save],
  );

  const toggleDone = useCallback(
    async (reminder: Reminder) => {
      if (reminder.repeatDays && !reminder.done) {
        const next = new Date(reminder.dueDate);
        next.setDate(next.getDate() + reminder.repeatDays);
        await save({
          ...reminder,
          dueDate: next.toISOString().slice(0, 10),
          lastNotifiedFor: null,
        });
      } else {
        await save({ ...reminder, done: !reminder.done });
      }
    },
    [save],
  );

  const removeReminder = useCallback(
    async (id: string) => {
      await deleteRecord("reminders", id);
      await reload();
    },
    [reload],
  );

  const markNotified = useCallback(
    async (reminder: Reminder) => {
      await save({ ...reminder, lastNotifiedFor: reminder.dueDate });
    },
    [save],
  );

  return { reminders, loading, addReminder, toggleDone, removeReminder, markNotified };
}
