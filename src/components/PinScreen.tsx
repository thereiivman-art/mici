import { useEffect, useState } from "react";
import { useVault } from "../lib/VaultContext";

const PIN_LENGTH = 6;

function Dots({ length, error }: { length: number; error: boolean }) {
  return (
    <div className="pin-dots">
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <span
          key={i}
          className={`pin-dot ${i < length ? "filled" : ""} ${error ? "error" : ""}`}
        />
      ))}
    </div>
  );
}

function Keypad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="keypad">
      {keys.map((k, i) =>
        k === "" ? (
          <button key={i} className="empty" disabled />
        ) : k === "del" ? (
          <button key={i} onClick={onDelete} aria-label="Effacer">
            ⌫
          </button>
        ) : (
          <button key={i} onClick={() => onDigit(k)}>
            {k}
          </button>
        ),
      )}
    </div>
  );
}

export function PinScreen() {
  const { hasPin, setupPin, unlock } = useVault();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setPin("");
  }, [step]);

  const handleDigit = async (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === PIN_LENGTH) {
      if (!hasPin) {
        if (step === "create") {
          setFirstPin(next);
          setStep("confirm");
        } else {
          if (next === firstPin) {
            await setupPin(next);
          } else {
            setError(true);
            setMessage("Les codes ne correspondent pas. Réessayez.");
            setStep("create");
            setFirstPin("");
            setTimeout(() => setPin(""), 300);
          }
        }
      } else {
        const ok = await unlock(next);
        if (!ok) {
          setError(true);
          setMessage("Code incorrect.");
          setTimeout(() => setPin(""), 300);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  const title = !hasPin
    ? step === "create"
      ? "Créez votre code PIN"
      : "Confirmez votre code PIN"
    : "Entrez votre code PIN";

  const subtitle = !hasPin
    ? "Ce code protège vos données médicales. Choisissez 6 chiffres et retenez-les : sans ce code, vos données ne sont pas récupérables."
    : "Vos données sont chiffrées sur cet appareil.";

  return (
    <div className="center-screen">
      <h2>{title}</h2>
      <p className="muted">{subtitle}</p>
      <Dots length={pin.length} error={error} />
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{message}</p>}
      <Keypad onDigit={handleDigit} onDelete={handleDelete} />
    </div>
  );
}
