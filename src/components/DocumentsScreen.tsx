import { useRef, useState } from "react";
import { useDocuments } from "../hooks/useDocuments";
import { DOCUMENT_LABELS, type DocumentCategory, type DocumentMeta } from "../types";
import { Sheet } from "./Sheet";
import { TrashIcon, DownloadIcon, FolderIcon } from "./Icons";

function formatDate(dateISO: string): string {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function AddDocumentForm({
  onAdd,
  onClose,
}: {
  onAdd: (file: File, category: DocumentCategory, date: string, notes: string) => Promise<void>;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("ordonnance");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) return;
    setSaving(true);
    await onAdd(file, category, date, notes.trim());
    setSaving(false);
    onClose();
  };

  return (
    <div>
      <div className="field">
        <label>Fichier (photo, PDF…)</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <p className="muted" style={{ marginTop: 4 }}>
            {file.name} · {formatSize(file.size)}
          </p>
        )}
      </div>
      <div className="row">
        <div className="field">
          <label>Catégorie</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
            {Object.entries(DOCUMENT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Date du document</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>Notes (optionnel)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ex. CRP, calprotectine…" />
      </div>
      <button className="btn btn-primary btn-block" disabled={!file || saving} onClick={submit}>
        Ajouter le document
      </button>
    </div>
  );
}

function DocumentRow({
  doc,
  onOpen,
  onDelete,
}: {
  doc: DocumentMeta;
  onOpen: (d: DocumentMeta) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="list-item">
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
          <span className="pill">{DOCUMENT_LABELS[doc.category]}</span>
        </div>
        <div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{doc.name}</div>
        <div className="muted">
          {formatDate(doc.date)} · {formatSize(doc.size)}
        </div>
        {doc.notes && <div style={{ marginTop: 4 }}>{doc.notes}</div>}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button className="icon-btn" onClick={() => onOpen(doc)} aria-label="Ouvrir">
          <DownloadIcon />
        </button>
        <button className="icon-btn" onClick={() => onDelete(doc.id)} aria-label="Supprimer">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

export function DocumentsScreen() {
  const { documents, loading, addDocument, removeDocument, openDocument } = useDocuments();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<DocumentCategory | "all">("all");

  const handleOpen = async (doc: DocumentMeta) => {
    const url = await openDocument(doc);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  const filtered = filter === "all" ? documents : documents.filter((d) => d.category === filter);

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Documents</h1>
      </div>

      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <button
          className={`pill ${filter === "all" ? "ok" : ""}`}
          style={{ border: "none", cursor: "pointer" }}
          onClick={() => setFilter("all")}
        >
          Tous
        </button>
        {Object.entries(DOCUMENT_LABELS).map(([k, label]) => (
          <button
            key={k}
            className={`pill ${filter === k ? "ok" : ""}`}
            style={{ border: "none", cursor: "pointer" }}
            onClick={() => setFilter(k as DocumentCategory)}
          >
            {label}
          </button>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <FolderIcon />
          <p style={{ marginTop: 8 }}>Aucun document.</p>
          <p className="muted">Ajoutez vos ordonnances, résumés et résultats d'analyses.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="card">
          {filtered.map((d) => (
            <DocumentRow key={d.id} doc={d} onOpen={handleOpen} onDelete={removeDocument} />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setOpen(true)} aria-label="Ajouter un document">
        +
      </button>

      {open && (
        <Sheet title="Nouveau document" onClose={() => setOpen(false)}>
          <AddDocumentForm onAdd={addDocument} onClose={() => setOpen(false)} />
        </Sheet>
      )}
    </div>
  );
}
