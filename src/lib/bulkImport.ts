import type { MedicationEntry } from "../types";

export interface ParsedBulkEntry {
  line: number;
  entry: Omit<MedicationEntry, "id" | "createdAt">;
}

export interface BulkParseError {
  line: number;
  raw: string;
  message: string;
}

export interface BulkParseResult {
  entries: ParsedBulkEntry[];
  errors: BulkParseError[];
}

type FieldKey = "date" | "heure" | "medicament" | "dose" | "zone" | "commentaire";

const FIELD_ALIASES: Record<FieldKey, string[]> = {
  date: ["date"],
  heure: ["heure", "time", "hour"],
  medicament: ["medicament", "medoc", "nom", "traitement", "medication"],
  dose: ["dose", "posologie"],
  zone: ["zone", "site", "injection"],
  commentaire: ["commentaire", "notes", "note", "remarque", "comment"],
};

const DEFAULT_MAPPING: FieldKey[] = ["date", "heure", "medicament", "dose", "zone", "commentaire"];

function normalizeHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function detectHeaderMapping(headerCols: string[]): (FieldKey | null)[] | null {
  const used = new Set<FieldKey>();
  const mapping: (FieldKey | null)[] = headerCols.map((raw) => {
    const norm = normalizeHeader(raw);
    for (const key of Object.keys(FIELD_ALIASES) as FieldKey[]) {
      if (used.has(key)) continue;
      if (FIELD_ALIASES[key].some((alias) => norm === alias || norm.includes(alias))) {
        used.add(key);
        return key;
      }
    }
    return null;
  });
  // On ne considère qu'il y a un en-tête que si au moins date + médicament sont reconnus.
  if (mapping.includes("date") && mapping.includes("medicament")) return mapping;
  return null;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  if (firstLine.includes(";")) return ";";
  if (firstLine.includes("\t")) return "\t";
  return ",";
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function parseTime(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})[:h](\d{2})$/);
  if (!m) return null;
  const hours = Number(m[1]);
  if (hours > 23) return null;
  return `${String(hours).padStart(2, "0")}:${m[2]}`;
}

/**
 * Format attendu, une prise par ligne, colonnes séparées par
 * virgule/point-virgule/tabulation : date;heure;médicament;dose;zone;commentaire
 *
 * La ligne d'en-tête (si présente) est détectée par le nom de ses colonnes et
 * sert à retrouver l'ordre réel des champs (peu importe l'ordre ou les
 * colonnes omises). Sans en-tête reconnu, l'ordre par défaut ci-dessus est
 * utilisé. Seules la date et le médicament sont obligatoires ; l'heure,
 * absente ou vide, vaut 08:00 par défaut.
 */
export function parseBulkText(text: string): BulkParseResult {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/);
  const entries: ParsedBulkEntry[] = [];
  const errors: BulkParseError[] = [];

  let mapping: (FieldKey | null)[] = DEFAULT_MAPPING;
  let dataStartIndex = 0;

  const firstNonEmptyIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstNonEmptyIdx !== -1) {
    const firstCols = lines[firstNonEmptyIdx]
      .trim()
      .split(delimiter)
      .map((c) => c.trim());
    const headerMapping = detectHeaderMapping(firstCols);
    if (headerMapping) {
      mapping = headerMapping;
      dataStartIndex = firstNonEmptyIdx + 1;
    }
  }

  lines.forEach((rawLine, idx) => {
    if (idx < dataStartIndex) return;
    const lineNumber = idx + 1;
    const line = rawLine.trim();
    if (!line) return;

    const cols = line.split(delimiter).map((c) => c.trim());
    const record: Partial<Record<FieldKey, string>> = {};
    cols.forEach((value, i) => {
      const key = mapping[i];
      if (key) record[key] = value;
    });

    const dateRaw = record.date ?? "";
    if (!dateRaw) {
      errors.push({ line: lineNumber, raw: rawLine, message: "Date manquante" });
      return;
    }
    const isoDate = parseDate(dateRaw);
    if (!isoDate) {
      errors.push({ line: lineNumber, raw: rawLine, message: `Date invalide : « ${dateRaw} »` });
      return;
    }

    const medName = (record.medicament ?? "").trim();
    if (!medName) {
      errors.push({ line: lineNumber, raw: rawLine, message: "Nom du médicament manquant" });
      return;
    }

    const time = parseTime(record.heure ?? "") ?? "08:00";
    const takenAt = new Date(`${isoDate}T${time}:00`).toISOString();

    entries.push({
      line: lineNumber,
      entry: {
        medName,
        dose: (record.dose ?? "").trim(),
        injectionSite: (record.zone ?? "").trim(),
        comment: (record.commentaire ?? "").trim(),
        takenAt,
      },
    });
  });

  return { entries, errors };
}

export const BULK_IMPORT_EXAMPLE = `Date;Heure;Médicament;Dose;Zone de prise;Commentaire
2026-01-05;08:00;Humira;40 mg;Cuisse gauche;
2026-01-19;08:15;Humira;40 mg;Cuisse droite;RAS
2026-02-02;;Humira;40 mg;Cuisse gauche;`;
