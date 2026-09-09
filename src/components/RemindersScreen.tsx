import { useState } from "react";
import { useReminders } from "../hooks/useReminders";
import { useReminderNotifications } from "../hooks/useReminderNotifications";
import { requestPermission, isSupported, isOverdue, isDueSoon } from "../lib/notifications";
import { REMINDER_LABELS, type Reminder, type ReminderType } from "../types";
import { Sheet } from "./Sheet";
import { ConfirmDialog } from "./ConfirmDialog";
import { TrashIcon, CheckIcon, BellIcon } from "./Icons";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDue(dateISO: string): string {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function AddReminderForm({
  onAdd,
  onClose,
}: {
  onAdd: (r: Omit<Reminder, "id" | "createdAt" | "done" | "lastNotifiedFor">) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<ReminderType>("pharmacie");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [repeat, setRepeat] = useState<string>("none");
  const [notes, setNotes] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    await requestPermission();
    await onAdd({
      type,
      title: title.trim(),
      dueDate,
      repeatDays: repeat === "none" ? null : Number(repeat),
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div>
      <div className="field">
        <label>Type de rappel</label>
        <select value={type} onChange={(e) => setType(e.target.value as ReminderType)}>
          {Object.entries(REMINDER_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Titre</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ex. Retirer Infliximab, RDV Dr Martin…"
          autoFocus
        />
      </div>
      <div className="row">
        <div className="field">
          <label>Échéance</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Récurrence</label>
          <select value={repeat} onChange={(e) => setRepeat(e.target.value)}>
            <option value="none">Aucune</option>
            <option value="7">Toutes les semaines</option>
            <option value="14">Toutes les 2 semaines</option>
            <option value="28">Toutes les 4 semaines</option>
            <option value="30">Tous les mois</option>
            <option value="90">Tous les 3 mois</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label>Notes (optionnel)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Détails utiles…" />
      </div>
      <button className="btn btn-primary btn-block" disabled={!title.trim()} onClick={submit}>
        Créer le rappel
      </button>
    </div>
  );
}

export function RemindersScreen() {
  const { reminders, loading, addReminder, toggleDone, removeReminder, markNotified } =
    useReminders();
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Reminder | null>(null);
  useReminderNotifications(reminders, markNotified);

  const active = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done && !r.repeatDays);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await removeReminder(pendingDelete.id);
    setPendingDelete(null);
  };

  const notifPermission = isSupported() ? Notification.permission : "unsupported";

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Rappels</h1>
      </div>

      {notifPermission === "default" && (
        <div className="banner">
          <BellIcon />
          <div>
            Activez les notifications pour être alerté(e) des échéances.{" "}
            <button
              className="btn btn-secondary"
              style={{ marginTop: 8, padding: "8px 12px" }}
              onClick={requestPermission}
            >
              Activer
            </button>
          </div>
        </div>
      )}

      {!loading && active.length === 0 && (
        <div className="empty-state">
          <p>Aucun rappel actif.</p>
          <p className="muted">Ajoutez un rappel pour la pharmacie, un RDV ou une prise de sang.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="card">
          {active.map((r) => (
            <div className="list-item" key={r.id}>
              <div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                  <span className="pill">{REMINDER_LABELS[r.type]}</span>
                  {isOverdue(r) && <span className="pill danger">En retard</span>}
                  {!isOverdue(r) && isDueSoon(r) && <span className="pill warning">Bientôt</span>}
                </div>
                <div style={{ fontWeight: 600 }}>{r.title}</div>
                <div className="muted">
                  {formatDue(r.dueDate)}
                  {r.repeatDays ? " · récurrent" : ""}
                </div>
                {r.notes && <div style={{ marginTop: 4 }}>{r.notes}</div>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="icon-btn" onClick={() => toggleDone(r)} aria-label="Marquer comme fait">
                  <CheckIcon />
                </button>
                <button className="icon-btn" onClick={() => setPendingDelete(r)} aria-label="Supprimer">
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <details className="card">
          <summary className="muted" style={{ cursor: "pointer" }}>
            Terminés ({done.length})
          </summary>
          {done.map((r) => (
            <div className="list-item" key={r.id}>
              <div style={{ textDecoration: "line-through", opacity: 0.6 }}>{r.title}</div>
              <button className="icon-btn" onClick={() => removeReminder(r.id)} aria-label="Supprimer">
                <TrashIcon />
              </button>
            </div>
          ))}
        </details>
      )}

      <button className="fab" onClick={() => setOpen(true)} aria-label="Ajouter un rappel">
        +
      </button>

      {open && (
        <Sheet title="Nouveau rappel" onClose={() => setOpen(false)}>
          <AddReminderForm onAdd={addReminder} onClose={() => setOpen(false)} />
        </Sheet>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Supprimer ce rappel ?"
          message={`${pendingDelete.title} — cette action est irréversible.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
