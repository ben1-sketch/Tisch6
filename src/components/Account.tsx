"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { euro } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fill } from "@/lib/text";
import { formatDate, formatDateTime } from "@/lib/time";
import type { Dictionary } from "@/i18n/get-dictionary";
import { InviteBox } from "./ApplyFlow";

type T = Dictionary["account"];

type Overview = {
  status: keyof T["statuses"];
  founder: boolean;
  available: boolean;
  inviteCode: string;
  buddyLinked: boolean;
  packageRemaining: number | null;
  packageExpires: string | null;
  packageIsFounder: boolean;
  discountCents: number | null;
  next: { token: string; status: string; startsAt: string } | null;
  reportToken: string | null;
};

export function Account({ lang, t, buddyT }: { lang: string; t: T; buddyT: Dictionary["apply"]["buddy"] }) {
  const [state, setState] = useState<"loading" | "loggedOut" | "loggedIn" | "deleted">(
    isSupabaseConfigured ? "loading" : "loggedOut",
  );
  const [overview, setOverview] = useState<Overview | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data } = await createClient().auth.getUser();
      if (!data.user) return setState("loggedOut");
      setPhone(data.user.phone ? `+${data.user.phone}` : null);
      const json = await fetch("/api/account").then((r) => r.json()).catch(() => ({}));
      setOverview(json.application ?? null);
      setState("loggedIn");
    })();
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    setState("loggedOut");
  }

  async function toggleAvailable(available: boolean) {
    if (!overview) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available }),
    });
    if (res.ok) setOverview({ ...overview, available });
    else setError((await res.json().catch(() => ({}))).error ?? "Fehler");
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(t.deleteConfirm)) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      await createClient().auth.signOut().catch(() => {});
      setState("deleted");
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Fehler");
    }
    setBusy(false);
  }

  const status = overview?.status ?? "none";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-semibold">{t.title}</h1>

      {state === "loading" && <div className="mt-8 h-40 animate-pulse rounded-3xl bg-night-800/60" />}

      {state === "loggedOut" && (
        <p className="glass mt-8 rounded-3xl p-6 text-mist">
          {t.loggedOutText}{" "}
          <Link href={`/${lang}/bewerben`} className="text-rose-400 underline">→</Link>
        </p>
      )}

      {state === "deleted" && <p className="glass mt-8 rounded-3xl p-6">{t.deleted}</p>}

      {state === "loggedIn" && (
        <div className="mt-8 space-y-6">
          <section className="glass rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm text-mist">{t.status}</h2>
              {overview?.founder && (
                <span className="rounded-full bg-rose-400 px-3 py-1 text-xs font-semibold text-night-950">★ {t.founder}</span>
              )}
            </div>
            <p className="mt-1 font-display text-xl font-semibold">{t.statuses[status]}</p>
            {phone && <p className="mt-1 text-sm text-mist">{phone}</p>}
            {overview?.packageRemaining && overview.packageExpires && (
              <p className="mt-3 text-sm text-mist">
                {fill(overview.packageIsFounder ? t.packageLeft : t.creditLeft, {
                  n: overview.packageRemaining,
                  date: formatDate(new Date(overview.packageExpires)),
                })}
              </p>
            )}
            {overview?.discountCents && !overview.packageRemaining && (
              <p className="mt-3 text-sm text-mist">{fill(t.discount, { price: euro(overview.discountCents) })}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {(status === "onboarding" || status === "none") && (
                <Link href={`/${lang}/bewerben`} className="rounded-full bg-rose-400 px-5 py-2.5 font-semibold text-night-950 hover:bg-rose-300">
                  {t.continue}
                </Link>
              )}
              <button onClick={logout} className="rounded-full border border-white/15 px-5 py-2.5 hover:border-white/30">
                {t.logout}
              </button>
            </div>
          </section>

          {overview?.next && (
            <section className="rounded-3xl border border-rose-400/30 p-6">
              <h2 className="text-sm text-mist">{t.next}</h2>
              <p className="mt-1 font-display text-lg font-semibold">{formatDateTime(new Date(overview.next.startsAt))}</p>
              <Link
                href={`/${lang}/einladung/${overview.next.token}`}
                className="mt-4 inline-block rounded-full bg-rose-400 px-5 py-2.5 font-semibold text-night-950 hover:bg-rose-300"
              >
                {t.nextOpen}
              </Link>
            </section>
          )}

          {status === "accepted" && overview && (
            <section className="glass rounded-3xl p-6">
              <label className="flex items-start justify-between gap-4">
                <span className="font-medium">{t.available}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={overview.available}
                  disabled={busy}
                  onChange={(e) => toggleAvailable(e.target.checked)}
                  className="mt-1 h-5 w-5 flex-none accent-rose-400"
                />
              </label>
              {!overview.available && <p className="mt-2 text-sm text-mist">{t.availableHint}</p>}
            </section>
          )}

          {overview && status !== "rejected" && status !== "blocked" && (
            <>
              {overview.buddyLinked && <p className="glass rounded-3xl p-6 text-mist">{t.buddyLinked}</p>}
              <InviteBox t={buddyT} lang={lang} code={overview.inviteCode} />
            </>
          )}

          {error && <p className="text-sm text-rose-300">{error}</p>}

          {overview?.reportToken && (
            <p className="text-center">
              <Link href={`/${lang}/einladung/${overview.reportToken}?melden=1#melden`} className="text-xs text-mist/70 underline hover:text-mist">
                {t.report}
              </Link>
            </p>
          )}

          <section className="rounded-3xl border border-rose-500/30 p-6">
            <h2 className="font-display text-lg font-semibold">{t.deleteTitle}</h2>
            <p className="mt-2 text-sm text-mist">{t.deleteText}</p>
            <button onClick={remove} disabled={busy} className="mt-4 rounded-full bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
              {t.delete}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
