import { useState } from "react";
import { useMedications } from "../hooks/useMedications";
import { INJECTION_SITE_SUGGESTIONS, type MedicationEntry } from "../types";
import { nextInjectionSite } from "../lib/injectionRotation";
import { Sheet } from "./Sheet";
import { ConfirmDialog } from "./ConfirmDialog";
import { BulkImportSheet } from "./BulkImportSheet";
import { TrashIcon, PencilIcon, UploadIcon } from "./Icons";

function nowLocalDatetime(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatTakenAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MedicationForm({
  initial,
  lastInjectionSite,
  onSubmit,
  onClose,
}: {
  initial?: MedicationEntry;
  lastInjectionSite?: string;
  onSubmit: (e: Omit<MedicationEntry, "id" | "createdAt">) => Promise<void>;
  onClose: () => void;
}) {
  const suggestedSite = lastInjectionSite ? nextInjectionSite(lastInjectionSite) : "";
  const canAlternate = !!lastInjectionSite && suggestedSite !== lastInjectionSite;
  const [alternate, setAlternate] = useState(canAlternate && !initial);
  const [medName, setMedName] = useState(initial?.medName ?? "");
  const [dose, setDose] = useState(initial?.dose ?? "");
  const [injectionSite, setInjectionSite] = useState(
    initial?.injectionSite ?? (alternate ? suggestedSite : ""),
  );
  const [takenAt, setTakenAt] = useState(
    initial ? toLocalDatetimeInput(initial.takenAt) : nowLocalDatetime(),
  );
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saving, setSaving] = useState(false);

  const handleAlternateToggle = (checked: boolean) => {
    setAlternate(checked);
    setInjectionSite(checked ? suggestedSite : "");
  };

  const submit = async () => {
    if (!medName.trim()) return;
    setSaving(true);
    await onSubmit({
      medName: medName.trim(),
      dose: dose.trim(),
      injectionSite: injectionSite.trim(),
      takenAt: new Date(takenAt).toISOString(),
      comment: comment.trim(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div>
      <div className="field">
        <label>Médicament</label>
        <input
          value={medName}
          onChange={(e) => setMedName(e.target.value)}
          placeholder="ex. Infliximab, Azathioprine…"
          autoFocus
        />
      </div>
      <div className="row">
        <div className="field">
          <label>Dose</label>
          <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="ex. 50 mg" />
        </div>
        <div className="field">
          <label>Date &amp; heure</label>
          <input
            type="datetime-local"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>Zone de prise (optionnel)</label>
        {canAlternate && (
          <label className="alternate-toggle">
            <input
              type="checkbox"
              checked={alternate}
              onChange={(e) => handleAlternateToggle(e.target.checked)}
            />
            <span>Alterner les zones de prise (gauche / droite)</span>
          </label>
        )}
        {canAlternate && alternate && (
          <div className="site-preview">
            Dernière prise : <strong>{lastInjectionSite}</strong>
            <br />
            Prochaine prise : <strong>{suggestedSite}</strong>
          </div>
        )}
        <input
          list="injection-sites"
          value={injectionSite}
          onChange={(e) => setInjectionSite(e.target.value)}
          placeholder="ex. Ventre, cuisse gauche…"
        />
        <datalist id="injection-sites">
          {INJECTION_SITE_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {canAlternate && (
          <p className="muted" style={{ marginTop: 4 }}>
            Chaque nouvelle prise alterne par rapport à la précédente (ex. toutes les 2 semaines :
            gauche → droite → gauche…). Décochez pour choisir librement.
          </p>
        )}
      </div>
      <div className="field">
        <label>Commentaire (optionnel)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Effets ressentis, contexte, symptômes…"
        />
      </div>
      <button className="btn btn-primary btn-block" disabled={!medName.trim() || saving} onClick={submit}>
        {initial ? "Enregistrer les modifications" : "Enregistrer la prise"}
      </button>
    </div>
  );
}

export function JournalScreen() {
  const { entries, loading, addEntry, addEntries, updateEntry, removeEntry } = useMedications();
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MedicationEntry | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await removeEntry(pendingDelete.id);
    setPendingDelete(null);
  };

  const editingIndex = editing ? entries.findIndex((e) => e.id === editing.id) : -1;
  const previousEntryForEditing = editingIndex >= 0 ? entries[editingIndex + 1] : undefined;

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Carnet de prises</h1>
        <button className="icon-btn" onClick={() => setBulkOpen(true)} aria-label="Importer en masse">
          <UploadIcon />
        </button>
      </div>

      {!loading && entries.length === 0 && (
        <div className="empty-state">
          <p>Aucune prise enregistrée pour le moment.</p>
          <p className="muted">
            Touchez le bouton + pour ajouter votre première prise, ou{" "}
            <button
              onClick={() => setBulkOpen(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              importez votre historique en masse
            </button>
            .
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="card">
          {entries.map((e) => (
            <div className="list-item" key={e.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{e.medName}</div>
                <div className="muted">
                  {formatTakenAt(e.takenAt)}
                  {e.dose ? ` · ${e.dose}` : ""}
                  {e.injectionSite ? ` · ${e.injectionSite}` : ""}
                </div>
                {e.comment && <div style={{ marginTop: 4 }}>{e.comment}</div>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="icon-btn" onClick={() => setEditing(e)} aria-label="Modifier">
                  <PencilIcon />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setPendingDelete(e)}
                  aria-label="Supprimer"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setOpen(true)} aria-label="Ajouter une prise">
        +
      </button>

      {open && (
        <Sheet title="Nouvelle prise" onClose={() => setOpen(false)}>
          <MedicationForm
            lastInjectionSite={entries[0]?.injectionSite}
            onSubmit={addEntry}
            onClose={() => setOpen(false)}
          />
        </Sheet>
      )}

      {editing && (
        <Sheet title="Modifier la prise" onClose={() => setEditing(null)}>
          <MedicationForm
            initial={editing}
            lastInjectionSite={previousEntryForEditing?.injectionSite}
            onSubmit={(e) => updateEntry(editing.id, e)}
            onClose={() => setEditing(null)}
          />
        </Sheet>
      )}

      {bulkOpen && <BulkImportSheet onImport={addEntries} onClose={() => setBulkOpen(false)} />}

      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer cette prise ?"
          message={`${pendingDelete.medName} · ${formatTakenAt(pendingDelete.takenAt)} — cette action est irréversible.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
