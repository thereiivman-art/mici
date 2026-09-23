import { useEffect, useRef, useState } from "react";
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

function Keypad({
  onDigit,
  onDelete,
  disabled,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="keypad">
      {keys.map((k, i) =>
        k === "" ? (
          <button key={i} className="empty" disabled />
        ) : k === "del" ? (
          <button key={i} onClick={onDelete} disabled={disabled} aria-label="Effacer">
            ⌫
          </button>
        ) : (
          <button key={i} onClick={() => onDigit(k)} disabled={disabled}>
            {k}
          </button>
        ),
      )}
    </div>
  );
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s.toString().padStart(2, "0")} s` : `${s} s`;
}

export function PinScreen() {
  const { hasPin, setupPin, unlock, lockedUntil, failedAttempts } = useVault();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    setPin("");
  }, [step]);

  useEffect(() => {
    if (!lockedUntil) {
      setRemainingSeconds(0);
      return;
    }
    const tick = () => {
      const secs = Math.max(0, Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000));
      setRemainingSeconds(secs);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = remainingSeconds > 0;
  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;

  // setPin utilise toujours un updater fonctionnel : même si plusieurs
  // frappes arrivent très rapprochées (clavier physique tapé vite, ou
  // événements synthétiques envoyés sans délai), chaque appel part de la
  // valeur réellement la plus récente gérée par React, sans jamais perdre
  // de chiffre à cause d'une closure périmée sur `pin`.
  const handleDigit = (d: string) => {
    if (isLockedRef.current) return;
    setPin((prev) => (prev.length >= PIN_LENGTH ? prev : prev + d));
    setError(false);
  };

  const handleDelete = () => {
    if (isLockedRef.current) return;
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  // La logique "code complet" réagit à `pin` via un effet plutôt que d'être
  // calculée en ligne dans handleDigit, pour toujours partir de la valeur de
  // pin réellement commitée par React.
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    let cancelled = false;
    (async () => {
      if (!hasPin) {
        if (step === "create") {
          setFirstPin(pin);
          setStep("confirm");
        } else if (pin === firstPin) {
          await setupPin(pin);
        } else if (!cancelled) {
          setError(true);
          setMessage("Les codes ne correspondent pas. Réessayez.");
          setStep("create");
          setFirstPin("");
          setTimeout(() => setPin(""), 300);
        }
      } else {
        const ok = await unlock(pin);
        if (!ok && !cancelled) {
          setError(true);
          setMessage("Code incorrect.");
          setTimeout(() => setPin(""), 300);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // Permet de saisir le code avec le clavier physique (utile sur PC), en plus
  // du pavé tactile.
  const handleDigitRef = useRef(handleDigit);
  handleDigitRef.current = handleDigit;
  const handleDeleteRef = useRef(handleDelete);
  handleDeleteRef.current = handleDelete;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitRef.current(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDeleteRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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
      {error && !isLocked && (
        <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{message}</p>
      )}
      {isLocked && (
        <div className="banner" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
          Trop de tentatives incorrectes ({failedAttempts}). Réessayez dans{" "}
          {formatCountdown(remainingSeconds)}.
        </div>
      )}
      <Keypad onDigit={handleDigit} onDelete={handleDelete} disabled={isLocked} />
    </div>
  );
}
