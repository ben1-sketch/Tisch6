"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PRICES, euro } from "@/lib/config";
import { fill } from "@/lib/text";
import { formatDateTime } from "@/lib/time";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { SeatView } from "@/lib/views";

type T = Dictionary["seat"];

const primary =
  "btn btn-primary w-full disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";
const secondary =
  "w-full rounded-full border border-white/15 px-6 py-3 text-center font-medium transition hover:border-white/30 disabled:opacity-50";

export function SeatPage({ view, t, lang, paid, openReport = false }: { view: SeatView; t: T; lang: string; paid: boolean; openReport?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const start = new Date(view.startsAt);
  const open = view.status === "invited" || view.status === "offered";
  const waitingForPayment = paid && open && polls < 12;

  // Nach der Rückkehr von Stripe: kurz warten, bis die Zahlung bestätigt ist
  useEffect(() => {
    if (!waitingForPayment) return;
    const timer = setTimeout(() => {
      setPolls((n) => n + 1);
      router.refresh();
    }, 2500);
    return () => clearTimeout(timer);
  }, [waitingForPayment, polls, router]);

  async function act(action: string, body: object = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/seat/${view.token}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? t.error);
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    }
    setBusy(false);
  }

  const details: [string, React.ReactNode][] = [
    [t.when, formatDateTime(start)],
    [t.where, view.restaurant.district ? `${view.restaurant.name} (${view.restaurant.district})` : view.restaurant.name],
    ...(view.restaurant.address
      ? ([
          [
            t.address,
            <span key="address">
              {view.restaurant.address}
              {view.restaurant.mapsUrl && (
                <>
                  {" · "}
                  <a href={view.restaurant.mapsUrl} target="_blank" rel="noreferrer" className="text-gold-400 underline">
                    {t.map}
                  </a>
                </>
              )}
            </span>,
          ],
        ] as [string, React.ReactNode][])
      : []),
    [t.table, view.table],
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:px-6 sm:py-16">
      <section className="glass rounded-3xl p-6 sm:p-8">
        <span className="inline-flex rounded-full border border-gold-400/30 bg-gold-400/10 px-3 py-1 text-xs font-medium text-gold-300">
          {t.chips[view.status]}
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold sm:text-3xl">{fill(t.titles[view.status], { name: view.firstName })}</h1>
        <p className="mt-2 text-mist">{t.leads[view.status]}</p>

        <dl className="mt-6 divide-y divide-white/10 rounded-2xl bg-night-950/50">
          {details.map(([label, value]) => (
            <div key={label} className="flex gap-4 px-4 py-3 text-sm">
              <dt className="w-24 flex-none text-mist">{label}</dt>
              <dd className="text-cloud">{value}</dd>
            </div>
          ))}
        </dl>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-gold-300">
            {error}
          </p>
        )}

        {waitingForPayment && <p className="mt-6 animate-pulse text-center text-mist">{t.confirming}</p>}

        {open && view.offer && !waitingForPayment && (
          <div className="mt-6 space-y-3">
            {view.expiresAt && <p className="text-sm text-mist">{fill(t.deadline, { date: formatDateTime(new Date(view.expiresAt)) })}</p>}
            {view.offer.packageRemaining ? (
              <>
                <button className={primary} disabled={busy} onClick={() => act("credit")}>
                  {view.offer.packageIsFounder ? t.usePackage : t.useCredit}
                </button>
                <p className="text-center text-xs text-mist">
                  {fill(view.offer.packageIsFounder ? t.packageLeft : t.creditLeft, { n: view.offer.packageRemaining })}
                </p>
              </>
            ) : (
              <>
                <button className={primary} disabled={busy || !view.paymentsEnabled} onClick={() => act("checkout")}>
                  {fill(t.payWith, { price: euro(view.offer.priceCents) })}
                </button>
                {view.offer.discounted && (
                  <p className="text-center text-xs text-mist line-through">{fill(t.insteadOf, { price: euro(PRICES.seat) })}</p>
                )}
                {view.offer.founderAvailable && (
                  <div className="rounded-2xl border border-gold-400/40 bg-gold-400/5 p-4">
                    <p className="font-display font-semibold">{t.founderTitle}</p>
                    <p className="mt-1 text-sm text-mist">{t.founderText}</p>
                    <button
                      className={`${secondary} mt-3 border-gold-400/60 text-gold-300`}
                      disabled={busy || !view.paymentsEnabled}
                      onClick={() => act("checkout", { package: true })}
                    >
                      {t.founderButton}
                    </button>
                  </div>
                )}
                {!view.paymentsEnabled && <p className="text-sm text-gold-300">{t.paymentsOff}</p>}
              </>
            )}
            <p className="text-center text-xs text-mist">{t.foodNote}</p>
            <button
              className="w-full py-2 text-sm text-mist underline hover:text-cloud"
              disabled={busy}
              onClick={() => window.confirm(t.declineConfirm) && act("decline")}
            >
              {t.decline}
            </button>
          </div>
        )}

        {view.status === "confirmed" && (
          <a href={`/api/seat/${view.token}/ics`} className={`${secondary} mt-6 block`}>
            {t.calendar}
          </a>
        )}

        {view.status === "attended" && view.canFeedback && (
          <div className="mt-6 space-y-2">
            <Link href={`/${lang}/wiedersehen/${view.token}`} className={`${primary} block`}>
              {t.feedback}
            </Link>
            {view.feedbackDone && <p className="text-center text-sm text-mist">{t.feedbackDone}</p>}
          </div>
        )}
      </section>

      {(view.card || view.cardSoon) && (
        <section className="rounded-3xl border border-gold-400/30 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">{t.cardTitle}</h2>
          {view.card ? (
            <>
              {view.card.runden.map((r) => (
                <div key={r.name} className="mt-4">
                  <h3 className="text-sm font-semibold text-gold-300">{r.name}</h3>
                  <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-cloud">
                    {r.fragen.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ol>
                </div>
              ))}
              <ul className="mt-5 space-y-1 border-t border-white/10 pt-4 text-sm text-mist">
                {t.cardRules.map((rule) => (
                  <li key={rule}>· {rule}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-mist">{t.cardSoon}</p>
          )}
        </section>
      )}

      {view.canCancel && (
        <section className="rounded-3xl border border-white/10 p-6 sm:p-8">
          <h2 className="font-display text-lg font-semibold">{t.cancelTitle}</h2>
          <p className="mt-2 text-sm text-mist">
            {view.cancelMovedFree
              ? t.cancelMoved
              : view.cancelFree
                ? fill(t.cancelFree, { date: formatDateTime(new Date(view.freeCancelUntil)) })
                : t.cancelLate}
          </p>
          <button className={`${secondary} mt-4`} disabled={busy} onClick={() => window.confirm(t.cancelConfirm) && act("cancel")}>
            {t.cancel}
          </button>
        </section>
      )}

      {view.canReport && view.members.length > 0 && <ReportBox t={t} token={view.token} members={view.members} initiallyOpen={openReport} />}
    </div>
  );
}

/** Diskreter Meldeknopf – zugeklappt nur ein unauffälliger Textlink */
function ReportBox({ t, token, members, initiallyOpen }: { t: T; token: string; members: SeatView["members"]; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [who, setWho] = useState("");
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function send() {
    setState("busy");
    const res = await fetch(`/api/seat/${token}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedId: who, reason }),
    });
    setState(res.ok ? "done" : "error");
  }

  if (!open) {
    return (
      <div className="text-center">
        <button className="text-xs text-mist/70 underline hover:text-mist" onClick={() => setOpen(true)}>
          {t.reportOpen}
        </button>
      </div>
    );
  }
  return (
    <section id="melden" className="scroll-mt-20 rounded-3xl border border-white/10 bg-night-800/60 p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold">{t.reportTitle}</h2>
      <p className="mt-2 text-sm text-mist">{t.reportText}</p>
      {state === "done" ? (
        <p className="mt-4 text-cloud">{t.reportThanks}</p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">{t.reportWho}</span>
            <select
              value={who}
              onChange={(e) => setWho(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-night-950/60 px-4 py-3 text-cloud"
            >
              <option value="">{t.choose}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">{t.reportReason}</span>
            <textarea
              rows={3}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-night-950/60 px-4 py-3 text-cloud"
            />
          </label>
          {state === "error" && <p className="text-sm text-gold-300">{t.error}</p>}
          <button className={primary} disabled={!who || state === "busy"} onClick={send}>
            {t.reportSend}
          </button>
        </div>
      )}
    </section>
  );
}
