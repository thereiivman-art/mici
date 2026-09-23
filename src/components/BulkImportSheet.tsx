import { useMemo, useRef, useState } from "react";
import { BULK_IMPORT_EXAMPLE, parseBulkText, type BulkParseResult } from "../lib/bulkImport";
import type { MedicationEntry } from "../types";
import { Sheet } from "./Sheet";

function formatTakenAt(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duplicateKey(medName: string, takenAt: string): string {
  return `${medName.trim().toLowerCase()}|${takenAt}`;
}

export function BulkImportSheet({
  existingEntries,
  onImport,
  onClose,
}: {
  existingEntries: MedicationEntry[];
  onImport: (entries: Omit<MedicationEntry, "id" | "createdAt">[]) => Promise<void>;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<BulkParseResult | null>(null);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingKeys = useMemo(
    () => new Set(existingEntries.map((e) => duplicateKey(e.medName, e.takenAt))),
    [existingEntries],
  );

  const flagged = useMemo(() => {
    if (!result) return [];
    return result.entries.map((e) => ({
      ...e,
      isDuplicate: existingKeys.has(duplicateKey(e.entry.medName, e.entry.takenAt)),
    }));
  }, [result, existingKeys]);

  const duplicateCount = flagged.filter((e) => e.isDuplicate).length;
  const toImport = includeDuplicates ? flagged : flagged.filter((e) => !e.isDuplicate);

  const analyze = () => setResult(parseBulkText(text));

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    setResult(parseBulkText(content));
  };

  const importAll = async () => {
    if (toImport.length === 0) return;
    setImporting(true);
    await onImport(toImport.map((e) => e.entry));
    setImporting(false);
    setImported(toImport.length);
  };

  if (imported > 0) {
    return (
      <Sheet title="Import en masse" onClose={onClose}>
        <div className="banner" style={{ background: "var(--ok-bg)", color: "var(--primary-strong)" }}>
          {imported} prise{imported > 1 ? "s" : ""} importée{imported > 1 ? "s" : ""} avec succès.
        </div>
        <button className="btn btn-primary btn-block" onClick={onClose}>
          Terminer
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Import en masse" onClose={onClose}>
      <p className="muted">
        Collez votre historique (une prise par ligne) ou importez un fichier CSV/texte exporté
        depuis un tableur. Fonctionne même si votre carnet contient déjà des prises — les lignes
        qui correspondent à une prise déjà enregistrée (même médicament, même date/heure) sont
        détectées et écartées par défaut pour éviter les doublons. Format :{" "}
        <code>date;heure;médicament;dose;zone;commentaire</code> — seules la date et le médicament
        sont obligatoires, le reste est optionnel.
      </p>
      <div className="field">
        <label>Fichier CSV ou texte (optionnel)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      <div className="field">
        <label>Ou collez le texte ici</label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder={BULK_IMPORT_EXAMPLE}
          style={{ minHeight: 160, fontFamily: "monospace", fontSize: "0.8rem" }}
        />
        <button
          className="btn btn-secondary"
          style={{ marginTop: 8 }}
          onClick={() => {
            setText(BULK_IMPORT_EXAMPLE);
            setResult(null);
          }}
        >
          Insérer un exemple
        </button>
      </div>

      {!result && (
        <button className="btn btn-primary btn-block" disabled={!text.trim()} onClick={analyze}>
          Analyser
        </button>
      )}

      {result && (
        <div>
          <div
            className="banner"
            style={{
              background: result.entries.length ? "var(--ok-bg)" : "var(--warning-bg)",
              color: result.entries.length ? "var(--primary-strong)" : "var(--warning)",
            }}
          >
            {result.entries.length} prise{result.entries.length > 1 ? "s" : ""} reconnue
            {result.entries.length > 1 ? "s" : ""}
            {duplicateCount > 0
              ? ` · ${duplicateCount} déjà existante${duplicateCount > 1 ? "s" : ""}`
              : ""}
            {result.errors.length > 0
              ? ` · ${result.errors.length} ligne${result.errors.length > 1 ? "s" : ""} ignorée${result.errors.length > 1 ? "s" : ""}`
              : ""}
          </div>

          {duplicateCount > 0 && (
            <label className="alternate-toggle">
              <input
                type="checkbox"
                checked={includeDuplicates}
                onChange={(e) => setIncludeDuplicates(e.target.checked)}
              />
              <span>
                Importer aussi les {duplicateCount} prise{duplicateCount > 1 ? "s" : ""} déjà
                existante{duplicateCount > 1 ? "s" : ""} (créera des doublons)
              </span>
            </label>
          )}

          {flagged.length > 0 && (
            <div className="card" style={{ maxHeight: 240, overflowY: "auto" }}>
              {flagged.slice(0, 25).map((e) => (
                <div className="list-item" key={e.line}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600 }}>{e.entry.medName}</span>
                      {e.isDuplicate && <span className="pill warning">Déjà existante</span>}
                    </div>
                    <div className="muted">
                      {formatTakenAt(e.entry.takenAt)}
                      {e.entry.dose ? ` · ${e.entry.dose}` : ""}
                      {e.entry.injectionSite ? ` · ${e.entry.injectionSite}` : ""}
                    </div>
                  </div>
                </div>
              ))}
              {flagged.length > 25 && (
                <p className="muted" style={{ padding: "8px 0 0" }}>
                  … et {flagged.length - 25} de plus.
                </p>
              )}
            </div>
          )}

          {result.errors.length > 0 && (
            <details className="card">
              <summary className="muted" style={{ cursor: "pointer" }}>
                Lignes ignorées ({result.errors.length})
              </summary>
              {result.errors.map((err) => (
                <div key={err.line} style={{ fontSize: "0.85rem", padding: "6px 0" }}>
                  Ligne {err.line} : {err.message}
                </div>
              ))}
            </details>
          )}

          <div className="row">
            <button className="btn btn-secondary" onClick={() => setResult(null)}>
              Modifier
            </button>
            <button
              className="btn btn-primary"
              disabled={toImport.length === 0 || importing}
              onClick={importAll}
            >
              Importer {toImport.length} prise{toImport.length > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
