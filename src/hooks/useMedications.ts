import { useCallback, useEffect, useState } from "react";
import { decryptJSON, encryptJSON } from "../lib/crypto";
import { deleteRecord, getAllRecords, putRecord } from "../lib/db";
import { useVault } from "../lib/VaultContext";
import type { MedicationEntry } from "../types";

export function useMedications() {
  const { key } = useVault();
  const [entries, setEntries] = useState<MedicationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    const records = await getAllRecords("medications");
    const decrypted = await Promise.all(
      records.map((r) => decryptJSON<MedicationEntry>(key, r.payload)),
    );
    decrypted.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
    setEntries(decrypted);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addEntry = useCallback(
    async (entry: Omit<MedicationEntry, "id" | "createdAt">) => {
      if (!key) return;
      const full: MedicationEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const payload = await encryptJSON(key, full);
      await putRecord("medications", full.id, payload);
      await reload();
    },
    [key, reload],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await deleteRecord("medications", id);
      await reload();
    },
    [reload],
  );

  return { entries, loading, addEntry, removeEntry };
}
