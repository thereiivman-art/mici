import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { deriveKey, hashPin, randomBytes, toBase64 } from "./crypto";
import { getAuthConfig, saveAuthConfig, wipeAllData, type AuthConfig } from "./db";

interface VaultContextValue {
  ready: boolean;
  hasPin: boolean;
  unlocked: boolean;
  key: CryptoKey | null;
  autoLockMinutes: number;
  setupPin: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  setAutoLockMinutes: (minutes: number) => Promise<void>;
  wipe: () => Promise<void>;
  noteActivity: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<AuthConfig | undefined>(undefined);
  const [key, setKey] = useState<CryptoKey | null>(null);
  const lastActivity = useRef<number>(Date.now());

  useEffect(() => {
    getAuthConfig().then((c) => {
      setConfig(c);
      setReady(true);
    });
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    const salt = randomBytes(16);
    const saltB64 = toBase64(salt.buffer);
    const verifierHash = await hashPin(pin, salt);
    const newConfig: AuthConfig = { salt: saltB64, verifierHash, autoLockMinutes: 5 };
    await saveAuthConfig(newConfig);
    setConfig(newConfig);
    const derived = await deriveKey(pin, salt);
    setKey(derived);
    lastActivity.current = Date.now();
  }, []);

  const unlock = useCallback(
    async (pin: string) => {
      if (!config) return false;
      const saltBytes = Uint8Array.from(atob(config.salt), (c) => c.charCodeAt(0));
      const attemptHash = await hashPin(pin, saltBytes);
      if (attemptHash !== config.verifierHash) return false;
      const derived = await deriveKey(pin, saltBytes);
      setKey(derived);
      lastActivity.current = Date.now();
      return true;
    },
    [config],
  );

  const lock = useCallback(() => setKey(null), []);

  const changePin = useCallback(
    async (currentPin: string, newPin: string) => {
      const ok = await unlock(currentPin);
      if (!ok || !config) return false;
      const salt = randomBytes(16);
      const saltB64 = toBase64(salt.buffer);
      const verifierHash = await hashPin(newPin, salt);
      const newConfig: AuthConfig = { ...config, salt: saltB64, verifierHash };
      await saveAuthConfig(newConfig);
      setConfig(newConfig);
      const derived = await deriveKey(newPin, salt);
      setKey(derived);
      return true;
    },
    [config, unlock],
  );

  const setAutoLockMinutes = useCallback(
    async (minutes: number) => {
      if (!config) return;
      const newConfig = { ...config, autoLockMinutes: minutes };
      await saveAuthConfig(newConfig);
      setConfig(newConfig);
    },
    [config],
  );

  const wipe = useCallback(async () => {
    await wipeAllData();
    setConfig(undefined);
    setKey(null);
  }, []);

  const noteActivity = useCallback(() => {
    lastActivity.current = Date.now();
  }, []);

  useEffect(() => {
    if (!key || !config) return;
    const minutes = config.autoLockMinutes;
    if (!minutes) return;
    const interval = window.setInterval(() => {
      if (Date.now() - lastActivity.current > minutes * 60_000) {
        setKey(null);
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [key, config]);

  const value: VaultContextValue = {
    ready,
    hasPin: !!config,
    unlocked: !!key,
    key,
    autoLockMinutes: config?.autoLockMinutes ?? 5,
    setupPin,
    unlock,
    lock,
    changePin,
    setAutoLockMinutes,
    wipe,
    noteActivity,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
