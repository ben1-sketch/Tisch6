"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm({ weiter }: { weiter: string }) {
  const [state, action, pending] = useActionState(login, null);
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
      {state?.error && (
        <p role="alert" className="text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-rose-400 px-6 py-3 font-semibold text-night-950 transition hover:bg-rose-300 disabled:opacity-50"
      >
        {pending ? "Bitte warten …" : "Anmelden"}
      </button>
    </form>
  );
}
