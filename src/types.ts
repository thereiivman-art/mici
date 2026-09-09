export type ReminderType = "pharmacie" | "rdv_medecin" | "prise_de_sang" | "autre";

export interface MedicationEntry {
  id: string;
  takenAt: string; // ISO datetime
  medName: string;
  dose: string;
  comment: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  dueDate: string; // ISO date
  repeatDays: number | null; // null = one-off
  notes: string;
  done: boolean;
  lastNotifiedFor: string | null; // dueDate value already notified
  createdAt: string;
}

export type DocumentCategory = "ordonnance" | "resume" | "analyse" | "autre";

export interface DocumentMeta {
  id: string;
  name: string;
  category: DocumentCategory;
  mimeType: string;
  size: number;
  date: string; // ISO date, e.g. date of the document
  notes: string;
  createdAt: string;
}

export interface DocumentFile extends DocumentMeta {
  blob: Blob;
}

export const REMINDER_LABELS: Record<ReminderType, string> = {
  pharmacie: "Pharmacie",
  rdv_medecin: "Rendez-vous médecin",
  prise_de_sang: "Prise de sang",
  autre: "Autre",
};

export const DOCUMENT_LABELS: Record<DocumentCategory, string> = {
  ordonnance: "Ordonnance",
  resume: "Résumé médical",
  analyse: "Résultat d'analyse",
  autre: "Autre",
};
