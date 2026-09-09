import { useState } from "react";
import { useVault } from "../lib/VaultContext";
import { requestPermission, isSupported } from "../lib/notifications";
import { Sheet } from "./Sheet";

function ChangePinForm({ onClose }: { onClose: () => void }) {
  const { changePin } = useVault();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError("");
    if (next.length !== 6) {
      setError("Le nouveau code doit contenir 6 chiffres.");
      return;
    }
    if (next !== confirm) {
      setError("La confirmation ne correspond pas.");
      return;
    }
    setSaving(true);
    const ok = await changePin(current, next);
    setSaving(false);
    if (!ok) {
      setError("Code actuel incorrect.");
      return;
    }
    onClose();
  };

  return (
    <div>
      <div className="field">
        <label>Code PIN actuel</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={current}
          onChange={(e) => setCurrent(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div className="field">
        <label>Nouveau code PIN (6 chiffres)</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={next}
          onChange={(e) => setNext(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div className="field">
        <label>Confirmer le nouveau code</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
        />
      </div>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
      <button className="btn btn-primary btn-block" disabled={saving} onClick={submit}>
        Mettre à jour le code
      </button>
    </div>
  );
}

function WipeConfirm({ onClose }: { onClose: () => void }) {
  const { wipe } = useVault();
  const [confirmText, setConfirmText] = useState("");
  const canWipe = confirmText.trim().toUpperCase() === "SUPPRIMER";

  return (
    <div>
      <p>
        Cette action supprime <strong>définitivement</strong> toutes les données de ce carnet sur
        cet appareil (prises, rappels, documents). Cette action est irréversible.
      </p>
      <div className="field">
        <label>Tapez SUPPRIMER pour confirmer</label>
        <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      </div>
      <button
        className="btn btn-danger btn-block"
        disabled={!canWipe}
        onClick={async () => {
          await wipe();
          onClose();
        }}
      >
        Supprimer toutes les données
      </button>
    </div>
  );
}

export function SettingsScreen() {
  const { lock, autoLockMinutes, setAutoLockMinutes } = useVault();
  const [sheet, setSheet] = useState<"pin" | "wipe" | null>(null);
  const notifPermission = isSupported() ? Notification.permission : "unsupported";

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Paramètres</h1>
      </div>

      <div className="card">
        <h3>Sécurité</h3>
        <p className="muted">
          Toutes vos données sont chiffrées sur cet appareil (AES-256) avec une clé dérivée de
          votre code PIN. Rien n'est envoyé sur internet : sans le code, les données ne peuvent
          pas être lues.
        </p>
        <div className="field">
          <label>Verrouillage automatique après inactivité</label>
          <select
            value={autoLockMinutes}
            onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
          >
            <option value={1}>1 minute</option>
            <option value={5}>5 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </div>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => setSheet("pin")}>
            Changer le code PIN
          </button>
          <button className="btn btn-secondary" onClick={lock}>
            Verrouiller maintenant
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Notifications</h3>
        <p className="muted">
          Statut :{" "}
          {notifPermission === "granted"
            ? "activées"
            : notifPermission === "denied"
              ? "refusées (à réactiver dans les réglages du navigateur)"
              : "non activées"}
        </p>
        {notifPermission === "default" && (
          <button className="btn btn-secondary" onClick={requestPermission}>
            Activer les notifications
          </button>
        )}
      </div>

      <div className="card">
        <h3>Données</h3>
        <p className="muted">
          Vos données restent uniquement sur cet appareil, dans son stockage local. La
          désinstallation de l'app ou l'effacement des données du navigateur les supprime
          définitivement — pensez à exporter vos documents importants si besoin.
        </p>
        <button className="btn btn-danger btn-block" onClick={() => setSheet("wipe")}>
          Supprimer toutes les données
        </button>
      </div>

      {sheet === "pin" && (
        <Sheet title="Changer le code PIN" onClose={() => setSheet(null)}>
          <ChangePinForm onClose={() => setSheet(null)} />
        </Sheet>
      )}
      {sheet === "wipe" && (
        <Sheet title="Supprimer toutes les données" onClose={() => setSheet(null)}>
          <WipeConfirm onClose={() => setSheet(null)} />
        </Sheet>
      )}
    </div>
  );
}
