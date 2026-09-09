import { useEffect, useState, type JSX } from "react";
import { VaultProvider, useVault } from "./lib/VaultContext";
import { PinScreen } from "./components/PinScreen";
import { DashboardScreen } from "./components/DashboardScreen";
import { JournalScreen } from "./components/JournalScreen";
import { RemindersScreen } from "./components/RemindersScreen";
import { DocumentsScreen } from "./components/DocumentsScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { HomeIcon, PillIcon, BellIcon, FolderIcon, GearIcon } from "./components/Icons";

export type Tab = "dashboard" | "journal" | "reminders" | "documents" | "settings";

const TABS: { id: Tab; label: string; icon: (a: { active?: boolean }) => JSX.Element }[] = [
  { id: "dashboard", label: "Accueil", icon: HomeIcon },
  { id: "journal", label: "Prises", icon: PillIcon },
  { id: "reminders", label: "Rappels", icon: BellIcon },
  { id: "documents", label: "Documents", icon: FolderIcon },
  { id: "settings", label: "Réglages", icon: GearIcon },
];

function MainApp() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const { noteActivity } = useVault();

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll"];
    const handler = () => noteActivity();
    events.forEach((ev) => window.addEventListener(ev, handler, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, handler));
  }, [noteActivity]);

  return (
    <div className="app-shell">
      {tab === "dashboard" && <DashboardScreen onNavigate={setTab} />}
      {tab === "journal" && <JournalScreen />}
      {tab === "reminders" && <RemindersScreen />}
      {tab === "documents" && <DocumentsScreen />}
      {tab === "settings" && <SettingsScreen />}

      <nav className="tabbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <Icon active={tab === id} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Gate() {
  const { ready, unlocked } = useVault();

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="center-screen" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="app-shell">
        <PinScreen />
      </div>
    );
  }

  return <MainApp />;
}

function App() {
  return (
    <VaultProvider>
      <Gate />
    </VaultProvider>
  );
}

export default App;
