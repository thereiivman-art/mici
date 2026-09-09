import { useMedications } from "../hooks/useMedications";
import { useReminders } from "../hooks/useReminders";
import { useDocuments } from "../hooks/useDocuments";
import { REMINDER_LABELS } from "../types";
import { isOverdue, isDueSoon } from "../lib/notifications";
import type { Tab } from "../App";

function formatTakenAt(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDue(dateISO: string): string {
  return new Date(dateISO + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function DashboardScreen({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const { entries } = useMedications();
  const { reminders } = useReminders();
  const { documents } = useDocuments();

  const lastEntry = entries[0];
  const upcoming = reminders
    .filter((r) => !r.done)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);
  const attention = reminders.filter((r) => !r.done && (isOverdue(r) || isDueSoon(r)));

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Mon carnet</h1>
      </div>

      {attention.length > 0 && (
        <div className="banner" style={{ background: "var(--warning-bg)", color: "var(--warning)" }}>
          <span>
            {attention.length === 1
              ? "1 rappel nécessite votre attention."
              : `${attention.length} rappels nécessitent votre attention.`}
          </span>
        </div>
      )}

      <div className="card" onClick={() => onNavigate("journal")} style={{ cursor: "pointer" }}>
        <h3>Dernière prise</h3>
        {lastEntry ? (
          <div>
            <div style={{ fontWeight: 600 }}>{lastEntry.medName}</div>
            <div className="muted">
              {formatTakenAt(lastEntry.takenAt)}
              {lastEntry.dose ? ` · ${lastEntry.dose}` : ""}
            </div>
          </div>
        ) : (
          <p className="muted">Aucune prise enregistrée.</p>
        )}
      </div>

      <div className="card" onClick={() => onNavigate("reminders")} style={{ cursor: "pointer" }}>
        <h3>Prochains rappels</h3>
        {upcoming.length === 0 && <p className="muted">Aucun rappel à venir.</p>}
        {upcoming.map((r) => (
          <div className="list-item" key={r.id}>
            <div>
              <span className="pill" style={{ marginRight: 6 }}>
                {REMINDER_LABELS[r.type]}
              </span>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{r.title}</div>
              <div className="muted">{formatDue(r.dueDate)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{entries.length}</div>
          <div className="muted">Prises enregistrées</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{documents.length}</div>
          <div className="muted">Documents rangés</div>
        </div>
      </div>
    </div>
  );
}
