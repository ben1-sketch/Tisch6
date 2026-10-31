"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { login } from "@/app/admin/actions";

/** Läuft die Seite als App vom Home-Bildschirm? */
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
function onDisplayModeChange(callback: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function LoginForm({ weiter }: { weiter: string }) {
  const [state, action, pending] = useActionState(login, null);
  // in der Admin-App am Home-Bildschirm vorausgewählt – solange niemand selbst klickt
  const standalone = useSyncExternalStore(onDisplayModeChange, isStandalone, () => false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const remember = choice ?? standalone;
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="weiter" value={weiter} />
      {/* für Passwort-Manager */}
      <input type="text" name="username" autoComplete="username" defaultValue="tisch6-admin" className="hidden" readOnly />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Passwort</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-xl border border-white/15 bg-night-950/60 px-4 py-3 text-cloud"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-mist">
        <input
          type="checkbox"
          name="bleiben"
          value="1"
          checked={remember}
          onChange={(e) => setChoice(e.target.checked)}
          className="h-4 w-4 accent-gold-400"
        />
        Auf diesem Gerät angemeldet bleiben (30 Tage)
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-gold-400 px-6 py-3 font-semibold text-night-950 transition hover:bg-gold-300 disabled:opacity-50"
      >
        {pending ? "Bitte warten …" : "Anmelden"}
      </button>
    </form>
  );
}
