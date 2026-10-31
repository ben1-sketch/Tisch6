"use client";

import Link from "next/link";
import { fill } from "@/lib/text";
import { formatDateTime } from "@/lib/time";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { AppView } from "@/lib/views";
import { usePushApp } from "./usePushApp";

type T = Dictionary["app"];

/** Persönliche Tisch6-App: Stand der Bewerbung bzw. nächster Tisch, Installationshilfe und Benachrichtigungen an/aus. */
export function TischApp({ view, t, lang, vapidKey }: { view: AppView; t: T; lang: string; vapidKey: string }) {
  const { env, canInstall, installNow, subscription, blocked, busy, message, enable, disable, test } = usePushApp({ token: view.token, vapidKey, texts: t });

  // abgelehnt: nur noch der Stand – Installieren und Benachrichtigungen braucht es nicht mehr
  const closed = view.stage === "closed";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-semibold">{fill(t.hello, { name: view.firstName })}</h1>
      <p className="mt-3 text-mist">{t.lead}</p>

      <section className="glass mt-8 rounded-3xl p-6">
        <h2 className="text-sm text-mist">{view.next ? t.nextTitle : t.statusTitle}</h2>
        {view.next ? (
          <>
            <p className="mt-1 font-display text-xl font-semibold">{formatDateTime(new Date(view.next.startsAt))}</p>
            <p className="mt-1 text-sm text-mist">{view.next.status === "confirmed" ? t.nextConfirmed : t.nextOpen}</p>
            <Link href={`/${lang}/einladung/${view.next.token}`} className="btn btn-primary mt-4">
              {t.nextButton}
            </Link>
          </>
        ) : (
          <p className="mt-1">{view.stage ? t.stage[view.stage] : t.nextNone}</p>
        )}
      </section>

      {env && !closed && !env.standalone && (
        <section className="mt-6 rounded-3xl border border-gold-400/30 p-6">
          <h2 className="font-display text-lg font-semibold">{t.installTitle}</h2>
          {env.ios ? (
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-mist">
              {t.installIos.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : canInstall ? (
            <button onClick={installNow} className="btn btn-primary mt-4">
              {t.installButton}
            </button>
          ) : (
            <p className="mt-2 text-mist">{t.installOther}</p>
          )}
        </section>
      )}

      {env && !closed && (
        <section className="glass mt-6 rounded-3xl p-6">
          <h2 className="font-display text-lg font-semibold">{t.pushTitle}</h2>
          {!env.push ? (
            <p className="mt-2 text-mist">{env.ios && !env.standalone ? t.pushIosFirst : t.pushUnsupported}</p>
          ) : subscription ? (
            <>
              <p className="mt-2">✓ {t.pushOn}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={test} disabled={busy} className="btn btn-primary disabled:opacity-50">
                  {t.pushTest}
                </button>
                <button onClick={disable} disabled={busy} className="rounded-full border border-white/15 px-5 py-2.5 hover:border-white/30 disabled:opacity-50">
                  {t.pushOff}
                </button>
              </div>
            </>
          ) : blocked ? (
            <p className="mt-2 text-mist">{t.pushBlocked}</p>
          ) : (
            <>
              <p className="mt-2 text-mist">{t.pushWhy}</p>
              <button onClick={enable} disabled={busy} className="btn btn-primary mt-4 disabled:opacity-50">
                {t.pushEnable}
              </button>
            </>
          )}
          {message && <p className="mt-4 text-sm text-gold-300">{message}</p>}
        </section>
      )}

      <p className="mt-6 text-center text-xs text-mist/70">{t.emailNote}</p>
      <p className="mt-3 text-center text-sm">
        <Link href={`/${lang}/konto`} className="text-gold-400 underline underline-offset-4 hover:text-gold-300">
          {t.account}
        </Link>
      </p>
    </div>
  );
}
