import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { EncryptedBlob, EncryptedPayload } from "./crypto";

const DB_NAME = "mici-carnet";
const DB_VERSION = 1;

export interface AuthConfig {
  salt: string;
  verifierHash: string;
  autoLockMinutes: number;
  failedAttempts: number;
  lockedUntil: string | null; // ISO datetime, null if not locked out
}

interface StoredDocument {
  id: string;
  metaIv: string;
  metaData: string;
  fileIv: string;
  fileBlob: Blob;
}

interface MiciDB extends DBSchema {
  meta: {
    key: string;
    value: AuthConfig;
  };
  medications: {
    key: string;
    value: { id: string; payload: EncryptedPayload };
  };
  reminders: {
    key: string;
    value: { id: string; payload: EncryptedPayload };
  };
  documents: {
    key: string;
    value: StoredDocument;
  };
}

let dbPromise: Promise<IDBPDatabase<MiciDB>> | null = null;

function getDB(): Promise<IDBPDatabase<MiciDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MiciDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
        if (!db.objectStoreNames.contains("medications"))
          db.createObjectStore("medications", { keyPath: "id" });
        if (!db.objectStoreNames.contains("reminders"))
          db.createObjectStore("reminders", { keyPath: "id" });
        if (!db.objectStoreNames.contains("documents"))
          db.createObjectStore("documents", { keyPath: "id" });
      },
    });
  }
  return dbPromise;
}

export async function getAuthConfig(): Promise<AuthConfig | undefined> {
  const db = await getDB();
  return db.get("meta", "auth");
}

export async function saveAuthConfig(config: AuthConfig): Promise<void> {
  const db = await getDB();
  await db.put("meta", config, "auth");
}

export async function wipeAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear("meta"),
    db.clear("medications"),
    db.clear("reminders"),
    db.clear("documents"),
  ]);
}

// --- generic encrypted-record collections (medications / reminders) ---

export async function putRecord(
  store: "medications" | "reminders",
  id: string,
  payload: EncryptedPayload,
): Promise<void> {
  const db = await getDB();
  await db.put(store, { id, payload });
}

export async function deleteRecord(store: "medications" | "reminders", id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

export async function getAllRecords(
  store: "medications" | "reminders",
): Promise<{ id: string; payload: EncryptedPayload }[]> {
  const db = await getDB();
  return db.getAll(store);
}

// --- documents (metadata + file both encrypted) ---

export async function putDocument(doc: StoredDocument): Promise<void> {
  const db = await getDB();
  await db.put("documents", doc);
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("documents", id);
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const db = await getDB();
  return db.getAll("documents");
}

export function packDocument(
  id: string,
  meta: EncryptedPayload,
  file: EncryptedBlob,
): StoredDocument {
  return { id, metaIv: meta.iv, metaData: meta.data, fileIv: file.iv, fileBlob: file.blob };
}

export function unpackDocumentMeta(doc: StoredDocument): EncryptedPayload {
  return { iv: doc.metaIv, data: doc.metaData };
}

export function unpackDocumentFile(doc: StoredDocument): EncryptedBlob {
  return { iv: doc.fileIv, blob: doc.fileBlob };
}
