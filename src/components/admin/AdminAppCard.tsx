"use client";

import { usePushApp } from "@/components/usePushApp";

const TEXTS = {
  enabled: "Geschafft! Hinweise aus dem Adminbereich kommen jetzt als Nachricht auf dieses Gerät.",
  disabled: "Benachrichtigungen sind aus. Hinweise bekommst du weiter per E-Mail.",
  testSent: "Die Probe-Nachricht ist unterwegs.",
  error: "Das hat nicht geklappt. Bitte versuch es noch einmal.",
  pushBlocked: "Benachrichtigungen sind blockiert. Erlaube sie in den Einstellungen deines Handys für „Tisch6 Admin“ und öffne die App neu.",
};

/** Adminbereich als eigene App: auf den Home-Bildschirm legen und Hinweise als Nachricht aufs Handy (Team-Gerät). */
export function AdminAppCard({ teamToken, vapidKey }: { teamToken: string; vapidKey: string }) {
  const { env, canInstall, installNow, subscription, blocked, busy, message, enable, disable, test } = usePushApp({
    token: teamToken,
    vapidKey,
    texts: TEXTS,
    probe: { ziel: "admin" },
  });

  return (
    <div className="space-y-4 text-sm">
      <p className="text-mist">
        Leg den Adminbereich als eigene App auf deinen Home-Bildschirm – mit goldenem Symbol „Tisch6 Admin“. Hinweise wie „Bewerbung zur Prüfung“
        kommen dann zusätzlich zur E-Mail als Nachricht aufs Handy: von 8 bis 22 Uhr, was nachts passiert, am Morgen.
      </p>

      {env &&
        !env.standalone &&
        (env.ios ? (
          <ol className="list-decimal space-y-1 pl-5 text-mist">
            <li>
              Diese Seite am iPhone in <strong className="text-cloud">Safari</strong> öffnen.
            </li>
            <li>Unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen.</li>
            <li>„Tisch6 Admin“ über das neue Symbol öffnen, anmelden (Haken bei „angemeldet bleiben“) und hier die Benachrichtigungen einschalten.</li>
          </ol>
        ) : canInstall ? (
          <button onClick={installNow} className="btn btn-primary">
            App installieren
          </button>
        ) : (
          <p className="text-mist">Am Handy: im Browser-Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.</p>
        ))}

      {env &&
        (!env.push ? (
          <p className="text-mist">
            {env.ios && !env.standalone
              ? "Benachrichtigungen gehen am iPhone erst in der App auf dem Home-Bildschirm."
              : "Dieser Browser kann leider keine Benachrichtigungen empfangen."}
          </p>
        ) : subscription ? (
          <div>
            <p>✓ Benachrichtigungen sind auf diesem Gerät an.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button onClick={test} disabled={busy} className="btn btn-primary disabled:opacity-50">
                Probe-Nachricht schicken
              </button>
              <button onClick={disable} disabled={busy} className="rounded-full border border-white/15 px-5 py-2.5 hover:border-white/30 disabled:opacity-50">
                Ausschalten
              </button>
            </div>
          </div>
        ) : blocked ? (
          <p className="text-mist">{TEXTS.pushBlocked}</p>
        ) : (
          <button onClick={enable} disabled={busy} className="btn btn-primary disabled:opacity-50">
            Benachrichtigungen einschalten
          </button>
        ))}

      {message && <p className="text-gold-300">{message}</p>}
    </div>
  );
}
