"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fill } from "@/lib/text";
import type { Dictionary } from "@/i18n/get-dictionary";

type State = { status: "working" | "done" | "failed"; name?: string; error?: string };

/** Ein-Klick-Zusage: Der Klick in der E-Mail genügt, die Seite bestätigt automatisch. */
export function Rejoin({ token, lang, t }: { token: string; lang: string; t: Dictionary["rejoin"] }) {
  const [state, setState] = useState<State>({ status: "working" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/rejoin/${token}`, { method: "POST" })
      .then(async (res) => ({ ok: res.ok, json: await res.json().catch(() => ({})) }))
      .catch(() => ({ ok: false, json: {} as { error?: string } }))
      .then(({ ok, json }) => {
        if (active) setState(ok ? { status: "done", name: json.firstName } : { status: "failed", error: json.error });
      });
    return () => {
      active = false;
    };
  }, [token, attempt]);

  return (
    <div className="glass mx-auto my-16 max-w-xl rounded-3xl p-8 text-center sm:p-10">
      {state.status === "working" && <p className="animate-pulse text-mist">{t.working}</p>}
      {state.status === "done" && (
        <>
          <h1 className="font-display text-2xl font-semibold">{fill(t.done, { name: state.name ?? "" })}</h1>
          <p className="mt-3 text-mist">{t.doneText}</p>
        </>
      )}
      {state.status === "failed" && (
        <>
          <h1 className="font-display text-2xl font-semibold">{t.failed}</h1>
          {state.error && <p className="mt-3 text-mist">{state.error}</p>}
          <button
            onClick={() => {
              setState({ status: "working" });
              setAttempt((n) => n + 1);
            }}
            className="btn btn-primary mt-6"
          >
            {t.retry}
          </button>
        </>
      )}
      <Link href={`/${lang}/konto`} className="mt-6 block text-sm text-mist underline">
        {t.account}
      </Link>
    </div>
  );
}
