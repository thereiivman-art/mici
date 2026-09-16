import { fromBase64, toBase64, type EncryptedPayload } from "./crypto";
import {
  getAllDocuments,
  getAllRecords,
  getAuthConfig,
  packDocument,
  putDocument,
  putRecord,
  saveAuthConfig,
  wipeAllData,
  type AuthConfig,
} from "./db";

const BACKUP_VERSION = 1;

interface BackupRecord {
  id: string;
  payload: EncryptedPayload;
}

interface BackupDocument {
  id: string;
  metaIv: string;
  metaData: string;
  fileIv: string;
  fileData: string; // base64
}

export interface BackupFile {
  version: number;
  exportedAt: string;
  auth: AuthConfig;
  medications: BackupRecord[];
  reminders: BackupRecord[];
  documents: BackupDocument[];
}

export async function buildBackup(): Promise<BackupFile> {
  const auth = await getAuthConfig();
  if (!auth) throw new Error("Aucun code PIN configuré sur cet appareil.");

  const medications = await getAllRecords("medications");
  const reminders = await getAllRecords("reminders");
  const rawDocuments = await getAllDocuments();
  const documents: BackupDocument[] = await Promise.all(
    rawDocuments.map(async (d) => ({
      id: d.id,
      metaIv: d.metaIv,
      metaData: d.metaData,
      fileIv: d.fileIv,
      fileData: toBase64(await d.fileBlob.arrayBuffer()),
    })),
  );

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    auth,
    medications,
    reminders,
    documents,
  };
}

export async function exportBackupBlob(): Promise<Blob> {
  const backup = await buildBackup();
  return new Blob([JSON.stringify(backup)], { type: "application/json" });
}

function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === "number" &&
    typeof v.exportedAt === "string" &&
    !!v.auth &&
    typeof v.auth === "object" &&
    Array.isArray(v.medications) &&
    Array.isArray(v.reminders) &&
    Array.isArray(v.documents)
  );
}

export async function parseBackupFile(file: File): Promise<BackupFile> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Fichier invalide : ce n'est pas un fichier de sauvegarde JSON valide.");
  }
  if (!isBackupFile(parsed)) {
    throw new Error("Fichier invalide : la structure de sauvegarde n'est pas reconnue.");
  }
  return parsed;
}

/** Remplace intégralement les données locales par le contenu de la sauvegarde. Irréversible. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await wipeAllData();
  await saveAuthConfig(backup.auth);
  for (const m of backup.medications) {
    await putRecord("medications", m.id, m.payload);
  }
  for (const r of backup.reminders) {
    await putRecord("reminders", r.id, r.payload);
  }
  for (const d of backup.documents) {
    await putDocument(
      packDocument(
        d.id,
        { iv: d.metaIv, data: d.metaData },
        { iv: d.fileIv, blob: new Blob([fromBase64(d.fileData) as BlobPart]) },
      ),
    );
  }
}
