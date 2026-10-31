/**
 * Wer schon dabei ist – Bewerber, eingeladene Gäste oder das Team –, merkt sich der Browser (localStorage, kein Cookie).
 * Dann steht oben statt „Jetzt bewerben“ der eigene Stand. Nach 180 Tagen vergessen.
 */
export type VisitorStatus = "beworben" | "eingeladen" | "team";
export type Visitor = { status: VisitorStatus; app?: string };

const KEY = "tisch6_gast";
const MAX_AGE_MS = 180 * 24 * 3600_000;
const STATUSES: readonly string[] = ["beworben", "eingeladen", "team"];
const listeners = new Set<() => void>();

type Stored = { status?: string; app?: string; at?: number };

/** Rohwert für useSyncExternalStore – null, wenn nichts gemerkt oder abgelaufen */
export function visitorSnapshot(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const at = (JSON.parse(raw) as Stored).at;
    return at && Date.now() - at <= MAX_AGE_MS ? raw : null;
  } catch {
    return null;
  }
}

export function parseVisitor(raw: string | null): Visitor | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Stored;
    if (!v.status || !STATUSES.includes(v.status)) return null;
    return { status: v.status as VisitorStatus, app: typeof v.app === "string" && /^[a-f0-9]{32}$/.test(v.app) ? v.app : undefined };
  } catch {
    return null;
  }
}

/**
 * Stand merken. keep = nur, wenn noch nichts bekannt ist (z. B. im Konto, das offene Einladungen nicht kennt);
 * ein schon bekannter App-Schlüssel bleibt erhalten.
 */
export function markVisitor(status: VisitorStatus, app?: string, keep = false) {
  try {
    const known = parseVisitor(visitorSnapshot());
    const next = keep && known ? { ...known, app: known.app ?? app } : { status, app: app ?? known?.app };
    localStorage.setItem(KEY, JSON.stringify({ ...next, at: Date.now() }));
  } catch {
    return; // privater Modus oder Speicher voll – dann bleibt es bei „Jetzt bewerben“
  }
  listeners.forEach((listener) => listener());
}

export function subscribeVisitor(callback: () => void) {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}
