"use client";

import { useState, type FormEvent } from "react";
import { fill } from "@/lib/text";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { FeedbackView } from "@/lib/views";

type T = Dictionary["feedback"];

function Stars({ label, value, onChange, t }: { label: string; value: number | null; onChange: (v: number) => void; t: T }) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium">{label}</legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={fill(t.stars, { n })}
            aria-pressed={value !== null && n <= value}
            onClick={() => onChange(n)}
            className={`h-11 w-11 rounded-full border text-lg transition ${
              value !== null && n <= value ? "border-gold-400 bg-gold-400 text-night-950" : "border-white/15 text-mist hover:border-white/30"
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function FeedbackForm({ view, t }: { view: FeedbackView; t: T }) {
  const s = view.saved;
  const [wants, setWants] = useState<string[]>(s?.wants_to_see ?? []);
  const [absent, setAbsent] = useState<string[]>(s?.absent ?? []);
  const [sharePhone, setSharePhone] = useState(s?.share_phone ?? true);
  const [evening, setEvening] = useState<number | null>(s?.rating_evening ?? null);
  const [table, setTable] = useState<number | null>(s?.rating_table ?? null);
  const [improve, setImprove] = useState(s?.improve ?? "");
  const [quote, setQuote] = useState(s?.quote ?? "");
  const [quoteOk, setQuoteOk] = useState(s?.quote_ok ?? false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("busy");
    setError(null);
    const res = await fetch(`/api/seat/${view.token}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratingEvening: evening, ratingTable: table, improve, wantsToSee: wants, absent, sharePhone, quote, quoteOk }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) setState("done");
    else {
      setError(json.error ?? null);
      setState("error");
    }
  }

  if (!view.open) {
    return <p className="glass mx-auto my-16 max-w-xl rounded-3xl p-8 text-center text-mist">{t.closed}</p>;
  }
  if (state === "done") {
    return (
      <div className="glass mx-auto my-16 max-w-xl rounded-3xl p-8 text-center">
        <p className="font-display text-2xl font-semibold">♥</p>
        <p className="mt-3 text-cloud">{t.thanks}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:px-6 sm:py-16">
      <header>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{fill(t.title, { name: view.firstName })}</h1>
        <p className="mt-2 text-mist">{t.lead}</p>
      </header>

      <section className="glass space-y-4 rounded-3xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold">{t.seeTitle}</h2>
        <p className="text-sm text-mist">{t.seeHint}</p>
        <div className="flex flex-wrap gap-2">
          {view.members.map((m) => {
            const active = wants.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => setWants(toggle(wants, m.id))}
                className={`rounded-full border px-4 py-2.5 transition ${
                  active ? "border-gold-400 bg-gold-400 text-night-950" : "border-white/15 hover:border-white/30"
                }`}
              >
                {active ? "♥ " : ""}
                {m.firstName}
              </button>
            );
          })}
        </div>
        <label className="flex gap-3 text-sm text-mist">
          <input type="checkbox" checked={sharePhone} onChange={(e) => setSharePhone(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-gold-400" />
          <span>{t.sharePhone}</span>
        </label>
      </section>

      <section className="glass space-y-6 rounded-3xl p-6 sm:p-8">
        <Stars label={t.q1} value={evening} onChange={setEvening} t={t} />
        <Stars label={t.q2} value={table} onChange={setTable} t={t} />
        <label className="block">
          <span className="mb-2 block font-medium">{t.q3}</span>
          <textarea
            rows={3}
            maxLength={1000}
            value={improve}
            onChange={(e) => setImprove(e.target.value)}
            placeholder={t.q3Placeholder}
            className="w-full rounded-xl border border-white/15 bg-night-950/60 px-4 py-3 text-cloud placeholder:text-mist/50"
          />
        </label>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-2 block font-medium">{t.q4}</span>
            <textarea
              rows={2}
              maxLength={300}
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder={t.q4Placeholder}
              className="w-full rounded-xl border border-white/15 bg-night-950/60 px-4 py-3 text-cloud placeholder:text-mist/50"
            />
          </label>
          {quote.trim() && (
            <label className="flex gap-3 text-sm text-mist">
              <input type="checkbox" checked={quoteOk} onChange={(e) => setQuoteOk(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-gold-400" />
              <span>{t.quoteOk}</span>
            </label>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 p-6 sm:p-8">
        <h2 className="font-medium">{t.absentTitle}</h2>
        <p className="mt-1 text-sm text-mist">{t.absentHint}</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {view.members.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={absent.includes(m.id)} onChange={() => setAbsent(toggle(absent, m.id))} className="h-4 w-4 accent-gold-400" />
              {m.firstName}
            </label>
          ))}
        </div>
      </section>

      {state === "error" && <p className="text-sm text-gold-300">{error ?? "Da ist etwas schiefgelaufen."}</p>}
      <button
        type="submit"
        disabled={state === "busy"}
        className="btn btn-primary w-full disabled:opacity-50 disabled:shadow-none"
      >
        {t.send}
      </button>
    </form>
  );
}
