"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/i18n/get-dictionary";

type T = Dictionary["apply"];
type Step = "loading" | "intro" | "phone" | "code" | "chat" | "done";
type Msg = { role: "user" | "assistant"; content: string };
type Application = { status: string; first_name: string; transcript: Msg[]; invite_code: string };

/** Ersetzt {platzhalter} in einem Text durch React-Elemente. */
function fill(text: string, parts: Record<string, ReactNode>) {
  return text.split(/(\{\w+\})/).map((chunk, i) => {
    const key = chunk.match(/^\{(\w+)\}$/)?.[1];
    return key && key in parts ? <span key={i}>{parts[key]}</span> : chunk;
  });
}

/** "0660 123 45 67" → "+436601234567" (österreichische Nummern ohne Vorwahl). */
function normalizePhone(raw: string) {
  let p = raw.replace(/[\s\-/()]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  else if (p.startsWith("0")) p = `+43${p.slice(1)}`;
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-night-950/60 px-4 py-3 text-cloud placeholder:text-mist/50 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-400/30";
const buttonClass =
  "w-full rounded-full bg-rose-400 px-6 py-3.5 font-semibold text-night-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-50";

export function ApplyFlow({ lang, t, invitedBy }: { lang: string; t: T; invitedBy?: string }) {
  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [step, setStep] = useState<Step>(configured ? "loading" : "intro");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ firstName: "", email: "", adult: false, privacy: false, terms: false, sensitive: false });
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState("onboarding");
  const [loggedIn, setLoggedIn] = useState(false);
  const [ownInvite, setOwnInvite] = useState<string | null>(null);

  function showApplication(app: Application) {
    setMessages(app.transcript);
    setStatus(app.status);
    setOwnInvite(app.invite_code);
    setStep(app.status === "onboarding" ? "chat" : "done");
  }

  useEffect(() => {
    if (!configured) return;
    supabase.current = createClient();
    (async () => {
      const { data } = await supabase.current!.auth.getUser();
      if (data.user) {
        setLoggedIn(true);
        const res = await fetch("/api/onboarding");
        const json = await res.json().catch(() => ({}));
        if (json.application) return showApplication(json.application);
      }
      setStep("intro");
    })();
  }, [configured]);

  async function startApplication() {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        email: form.email,
        locale: lang,
        inviteCode: invitedBy,
        consent: { adult: form.adult, privacy: form.privacy, terms: form.terms, sensitive: form.sensitive },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? t.errors.generic);
    showApplication(json.application);
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  const onIntro = (e: FormEvent) => {
    e.preventDefault();
    if (!configured) return setError(t.errors.notConfigured);
    if (loggedIn) return run(startApplication);
    setError(null);
    setStep("phone");
  };

  const onPhone = (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!normalized) return setError(t.errors.phone);
    run(async () => {
      const { error } = await supabase.current!.auth.signInWithOtp({ phone: normalized });
      if (error) throw new Error(t.errors.generic);
      setPhone(normalized);
      setStep("code");
    });
  };

  const onCode = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { error } = await supabase.current!.auth.verifyOtp({ phone, token: code.trim(), type: "sms" });
      if (error) throw new Error(t.errors.code);
      setLoggedIn(true);
      await startApplication();
    });
  };

  const stepIndex = { loading: 0, intro: 0, phone: 1, code: 2, chat: 3, done: 3 }[step];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      {step !== "done" && (
        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Fortschritt">
          {t.steps.map((label, i) => (
            <li key={label} className="text-xs text-mist">
              <div className={`mb-2 h-1 rounded-full ${i <= stepIndex ? "bg-rose-400" : "bg-white/10"}`} />
              <span className={i === stepIndex ? "text-cloud" : ""}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p role="alert" className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {step === "loading" && <div className="h-64 animate-pulse rounded-3xl bg-night-800/60" />}

      {step === "intro" && (
        <form onSubmit={onIntro} className="glass space-y-5 rounded-3xl p-6 sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.intro.title}</h1>
            <p className="mt-2 text-mist">{t.intro.lead}</p>
            {invitedBy && (
              <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">{t.intro.invited}</p>
            )}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.intro.firstName}</span>
            <input required maxLength={40} autoComplete="given-name" className={inputClass} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.intro.email}</span>
            <input required type="email" autoComplete="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <span className="mt-1 block text-xs text-mist">{t.intro.emailHint}</span>
          </label>
          <fieldset className="space-y-3 pt-2">
            {(
              [
                ["adult", t.intro.adult],
                ["privacy", fill(t.intro.privacy, { privacy: <Link href={`/${lang}/datenschutz`} target="_blank" className="text-rose-400 underline">{t.intro.privacyLink}</Link> })],
                ["terms", fill(t.intro.terms, { terms: <Link href={`/${lang}/agb`} target="_blank" className="text-rose-400 underline">{t.intro.termsLink}</Link> })],
                ["sensitive", t.intro.sensitive],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex gap-3 text-sm leading-relaxed text-mist">
                <input
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 flex-none accent-rose-400"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <button type="submit" disabled={busy} className={buttonClass}>
            {t.intro.next}
          </button>
        </form>
      )}

      {step === "phone" && (
        <form onSubmit={onPhone} className="glass space-y-5 rounded-3xl p-6 sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.phone.title}</h1>
            <p className="mt-2 text-mist">{t.phone.lead}</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.phone.label}</span>
            <input required type="tel" autoComplete="tel" inputMode="tel" placeholder={t.phone.placeholder} className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <span className="mt-1 block text-xs text-mist">{t.phone.hint}</span>
          </label>
          <button type="submit" disabled={busy} className={buttonClass}>
            {t.phone.send}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={onCode} className="glass space-y-5 rounded-3xl p-6 sm:p-8">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.code.title}</h1>
            <p className="mt-2 text-mist">{fill(t.code.lead, { phone: <strong className="text-cloud">{phone}</strong> })}</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.code.label}</span>
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              className={`${inputClass} text-center font-display text-2xl tracking-[0.5em]`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button type="submit" disabled={busy || code.length !== 6} className={buttonClass}>
            {t.code.verify}
          </button>
          <button type="button" onClick={() => { setCode(""); setStep("phone"); }} className="w-full text-sm text-mist underline hover:text-cloud">
            {t.code.resend}
          </button>
        </form>
      )}

      {step === "chat" && (
        <Chat
          t={t}
          messages={messages}
          onUpdate={setMessages}
          onComplete={(s) => {
            setStatus(s);
            setTimeout(() => setStep("done"), 2500);
          }}
        />
      )}

      {step === "done" && (
        <div className="glass rounded-3xl p-8 text-center sm:p-12">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {status === "rejected" ? t.done.rejectedTitle : t.done.title}
          </h1>
          <p className="mt-4 text-mist">
            {status === "rejected" ? t.done.rejectedText : fill(t.done.text, { email: <strong className="text-cloud">{form.email || "deine E-Mail-Adresse"}</strong> })}
          </p>
          {status !== "rejected" && ownInvite && <InviteBox t={t.buddy} lang={lang} code={ownInvite} />}
          <Link href={`/${lang}`} className="mt-8 inline-block rounded-full border border-white/15 px-6 py-3 hover:border-white/30">
            {t.done.home}
          </Link>
        </div>
      )}
    </div>
  );
}

function Chat({
  t,
  messages,
  onUpdate,
  onComplete,
}: {
  t: T;
  messages: Msg[];
  onUpdate: (m: Msg[]) => void;
  onComplete: (status: string) => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setError(null);
    setSending(true);
    const withUser: Msg[] = [...messages, { role: "user", content }];
    onUpdate(withUser);
    setText("");
    try {
      const res = await fetch("/api/onboarding/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? t.errors.generic);
      onUpdate([...withUser, { role: "assistant", content: json.reply }]);
      if (json.complete) {
        setFinished(true);
        onComplete(json.status);
      }
    } catch (err) {
      // Nachricht zurück ins Eingabefeld, damit nichts verloren geht
      onUpdate(messages);
      setText(content);
      setError(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="glass flex h-[min(75vh,720px)] flex-col overflow-hidden rounded-3xl">
      <header className="border-b border-white/10 px-5 py-4">
        <h1 className="font-display text-lg font-semibold">{t.chat.title}</h1>
        <p className="text-sm text-mist">{t.chat.lead}</p>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "rounded-br-sm bg-rose-400 text-night-950" : "rounded-bl-sm bg-night-700 text-cloud"
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}
        {sending && <p className="animate-pulse text-sm text-mist">{t.chat.typing}</p>}
        <div ref={endRef} />
      </div>
      {error && <p className="px-4 pb-2 text-sm text-rose-300">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
        <textarea
          rows={1}
          maxLength={1200}
          value={text}
          disabled={finished}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          placeholder={t.chat.placeholder}
          className={`${inputClass} resize-none`}
          aria-label={t.chat.placeholder}
        />
        <button type="submit" disabled={sending || finished || !text.trim()} className="rounded-full bg-rose-400 px-5 font-semibold text-night-950 transition hover:bg-rose-300 disabled:opacity-50">
          {t.chat.send}
        </button>
      </form>
    </section>
  );
}

/** "Bring eine Freundin mit": persönlicher Link, über den sich jemand als Duo bewirbt. */
export function InviteBox({ t, lang, code }: { t: T["buddy"]; lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/${lang}/bewerben?mit=${code}`;

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Tisch6", text: t.shareText, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="mt-8 rounded-2xl border border-rose-400/30 bg-rose-400/5 p-5 text-left">
      <h2 className="font-display text-lg font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-mist">{t.text}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} className={`${inputClass} text-sm`} onFocus={(e) => e.target.select()} aria-label={t.title} />
        <button type="button" onClick={share} className="shrink-0 rounded-full bg-rose-400 px-5 py-3 font-semibold text-night-950 hover:bg-rose-300">
          {copied ? t.copied : t.share}
        </button>
      </div>
    </div>
  );
}
