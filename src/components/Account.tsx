"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Dictionary } from "@/i18n/get-dictionary";
import { InviteBox } from "./ApplyFlow";

type T = Dictionary["account"];

export function Account({ lang, t, buddyT }: { lang: string; t: T; buddyT: Dictionary["apply"]["buddy"] }) {
  const [state, setState] = useState<"loading" | "loggedOut" | "loggedIn" | "deleted">(
    isSupabaseConfigured ? "loading" : "loggedOut",
  );
  const [status, setStatus] = useState<keyof T["statuses"]>("none");
  const [phone, setPhone] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ code: string; linked: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data } = await createClient().auth.getUser();
      if (!data.user) return setState("loggedOut");
      setPhone(data.user.phone ? `+${data.user.phone}` : null);
      const json = await fetch("/api/onboarding").then((r) => r.json()).catch(() => ({}));
      setStatus(json.application?.status ?? "none");
      if (json.application) setInvite({ code: json.application.invite_code, linked: Boolean(json.application.buddy_id) });
      setState("loggedIn");
    })();
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    setState("loggedOut");
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
            <h2 className="text-sm text-mist">{t.status}</h2>
            <p className="mt-1 font-display text-xl font-semibold">{t.statuses[status]}</p>
            {phone && <p className="mt-1 text-sm text-mist">{phone}</p>}
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
          {invite && status !== "rejected" && (
            <>
              {invite.linked && <p className="glass rounded-3xl p-6 text-mist">{t.buddyLinked}</p>}
              <InviteBox t={buddyT} lang={lang} code={invite.code} />
            </>
          )}
          <section className="rounded-3xl border border-rose-500/30 p-6">
            <h2 className="font-display text-lg font-semibold">{t.deleteTitle}</h2>
            <p className="mt-2 text-sm text-mist">{t.deleteText}</p>
            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
            <button onClick={remove} disabled={busy} className="mt-4 rounded-full bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
              {t.delete}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
