import { useCallback, useEffect, useState } from "react";
import { decryptBlob, decryptJSON, encryptBlob, encryptJSON } from "../lib/crypto";
import {
  deleteDocument,
  getAllDocuments,
  packDocument,
  putDocument,
  unpackDocumentFile,
  unpackDocumentMeta,
} from "../lib/db";
import { useVault } from "../lib/VaultContext";
import type { DocumentMeta } from "../types";

export function useDocuments() {
  const { key } = useVault();
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    const stored = await getAllDocuments();
    const decrypted = await Promise.all(
      stored.map((d) => decryptJSON<DocumentMeta>(key, unpackDocumentMeta(d))),
    );
    decrypted.sort((a, b) => b.date.localeCompare(a.date));
    setDocuments(decrypted);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addDocument = useCallback(
    async (file: File, category: DocumentMeta["category"], date: string, notes: string) => {
      if (!key) return;
      const meta: DocumentMeta = {
        id: crypto.randomUUID(),
        name: file.name,
        category,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        date,
        notes,
        createdAt: new Date().toISOString(),
      };
      const metaPayload = await encryptJSON(key, meta);
      const filePayload = await encryptBlob(key, file);
      await putDocument(packDocument(meta.id, metaPayload, filePayload));
      await reload();
    },
    [key, reload],
  );

  const updateDocumentMeta = useCallback(
    async (id: string, changes: Pick<DocumentMeta, "name" | "category" | "date" | "notes">) => {
      if (!key) return;
      const existing = documents.find((d) => d.id === id);
      const stored = (await getAllDocuments()).find((d) => d.id === id);
      if (!existing || !stored) return;
      const updatedMeta: DocumentMeta = { ...existing, ...changes };
      const metaPayload = await encryptJSON(key, updatedMeta);
      await putDocument(packDocument(id, metaPayload, unpackDocumentFile(stored)));
      await reload();
    },
    [key, documents, reload],
  );

  const removeDocument = useCallback(
    async (id: string) => {
      await deleteDocument(id);
      await reload();
    },
    [reload],
  );

  const openDocument = useCallback(
    async (docMeta: DocumentMeta): Promise<string | null> => {
      if (!key) return null;
      const stored = (await getAllDocuments()).find((d) => d.id === docMeta.id);
      if (!stored) return null;
      const blob = await decryptBlob(key, unpackDocumentFile(stored), docMeta.mimeType);
      return URL.createObjectURL(blob);
    },
    [key],
  );

  return { documents, loading, addDocument, updateDocumentMeta, removeDocument, openDocument };
}
