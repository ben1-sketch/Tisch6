"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailTypo } from "@/lib/email-typo";
import { normalizePhone } from "@/lib/phone";
import { instagramUrl } from "@/lib/site";
import { SOURCES } from "@/lib/source";
import type { Dictionary } from "@/i18n/get-dictionary";

type T = Dictionary["apply"];
type Step = "loading" | "intro" | "phone" | "code" | "photo" | "chat" | "done";
type Msg = { role: "user" | "assistant"; content: string };
type Application = { status: string; first_name: string; transcript: Msg[]; invite_code: string; photo_path: string | null };

/** Ersetzt {platzhalter} in einem Text durch React-Elemente. */
function fill(text: string, parts: Record<string, ReactNode>) {
  return text.split(/(\{\w+\})/).map((chunk, i) => {
    const key = chunk.match(/^\{(\w+)\}$/)?.[1];
    return key && key in parts ? <span key={i}>{parts[key]}</span> : chunk;
  });
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-night-950/60 px-4 py-3 text-cloud placeholder:text-mist/50 outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/30";
const buttonClass =
  "btn btn-primary w-full disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

/** resume: Link aus der Erinnerungs-Mail – gleich zur Anmeldung, ohne das Startformular noch einmal auszufüllen */
export function ApplyFlow({ lang, t, invitedBy, campaign, resume = false }: { lang: string; t: T; invitedBy?: string; campaign?: string; resume?: boolean }) {
  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  const configured = isSupabaseConfigured;
  const [step, setStep] = useState<Step>(configured ? "loading" : "intro");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ firstName: "", email: "", adult: false, privacy: false, terms: false, sensitive: false });
  const [together, setTogether] = useState(true);
  const [source, setSource] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState("onboarding");
  const [loggedIn, setLoggedIn] = useState(false);
  const [ownInvite, setOwnInvite] = useState<string | null>(null);
  const emailSuggestion = emailTypo(form.email);

  // Bei jedem Schritt nach oben, damit Fortschritt und Überschrift sichtbar sind
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  function showApplication(app: Application) {
    setMessages(app.transcript);
    setStatus(app.status);
    setOwnInvite(app.invite_code);
    setStep(app.status !== "onboarding" ? "done" : app.photo_path ? "chat" : "photo");
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
      setStep(resume && !data.user ? "phone" : "intro");
    })();
  }, [configured, resume]);

  /** Nach der Anmeldung: eine angefangene Bewerbung geht dort weiter, wo sie aufgehört hat */
  async function continueOrStart() {
    const res = await fetch("/api/onboarding");
    const json = await res.json().catch(() => ({}));
    if (json.application) return showApplication(json.application);
    if (!form.firstName) {
      setStep("intro");
      throw new Error(t.resume.notFound);
    }
    await startApplication();
  }

  async function startApplication() {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        email: form.email,
        locale: lang,
        inviteCode: invitedBy,
        together: Boolean(invitedBy) && together,
        source: source || undefined,
        campaign,
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
      await continueOrStart();
    });
  };

  const resuming = resume && !form.firstName;

  const stepIndex = { loading: 0, intro: 0, phone: 1, code: 2, photo: 3, chat: 4, done: 4 }[step];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      {step !== "done" && (
        <ol className="mb-8 grid grid-cols-5 gap-2" aria-label="Fortschritt">
          {t.steps.map((label, i) => (
            <li key={label} className="min-w-0 text-xs text-mist">
              <div className={`mb-2 h-1 rounded-full ${i <= stepIndex ? "bg-gold-400" : "bg-white/10"}`} />
              <span className={`block truncate ${i === stepIndex ? "text-cloud" : ""}`}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      {error && (
        <p role="alert" className="mb-6 rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-gold-300">
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
              <div className="mt-4 rounded-xl border border-gold-400/30 bg-gold-400/10 px-4 py-3 text-sm text-gold-300">
                <p>{t.intro.invited}</p>
                <label className="mt-3 flex gap-3 text-cloud">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 flex-none accent-gold-400" checked={together} onChange={(e) => setTogether(e.target.checked)} />
                  <span>{t.intro.together}</span>
                </label>
              </div>
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
          {emailSuggestion && (
            <button type="button" className="-mt-2 block text-left text-sm text-gold-300 underline" onClick={() => setForm({ ...form, email: emailSuggestion })}>
              {fill(t.intro.emailTypo, { email: <strong>{emailSuggestion}</strong> })}
            </button>
          )}
          {!invitedBy && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{t.intro.source}</span>
              <select className={inputClass} value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="">{t.intro.sourceChoose}</option>
                {Object.entries(SOURCES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <fieldset className="space-y-3 pt-2">
            {(
              [
                ["adult", t.intro.adult],
                ["privacy", fill(t.intro.privacy, { privacy: <Link href={`/${lang}/datenschutz`} target="_blank" className="text-gold-400 underline">{t.intro.privacyLink}</Link> })],
                ["terms", fill(t.intro.terms, { terms: <Link href={`/${lang}/agb`} target="_blank" className="text-gold-400 underline">{t.intro.termsLink}</Link> })],
                ["sensitive", t.intro.sensitive],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex gap-3 text-sm leading-relaxed text-mist">
                <input
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 flex-none accent-gold-400"
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
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{resuming ? t.resume.title : t.phone.title}</h1>
            <p className="mt-2 text-mist">{resuming ? t.resume.lead : t.phone.lead}</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.phone.label}</span>
            <input required type="tel" autoComplete="tel" inputMode="tel" placeholder={t.phone.placeholder} className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <span className="mt-1 block text-xs text-mist">{t.phone.hint}</span>
          </label>
          <button type="submit" disabled={busy} className={buttonClass}>
            {t.phone.send}
          </button>
          {resuming && (
            <button type="button" onClick={() => setStep("intro")} className="w-full text-sm text-mist underline hover:text-cloud">
              {t.resume.fresh}
            </button>
          )}
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

      {step === "photo" && <PhotoStep t={t.photo} onDone={() => setStep("chat")} />}

      {step === "chat" && (
        <Chat
          t={t}
          lang={lang}
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
          {status !== "rejected" && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="mt-6 block text-gold-400 underline underline-offset-4 hover:text-gold-300">
              {t.done.instagram}
            </a>
          )}
          <Link href={`/${lang}`} className="mt-8 inline-block rounded-full border border-white/15 px-6 py-3 hover:border-white/30">
            {t.done.home}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Bis zu dieser Breite liegt der Chat als Vollbild über der Seite (Handy) */
const HANDY = "(max-width: 639px)";

function Chat({
  t,
  lang,
  messages,
  onUpdate,
  onComplete,
}: {
  t: T;
  lang: string;
  messages: Msg[];
  onUpdate: (m: Msg[]) => void;
  onComplete: (status: string) => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const boxRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Liest man gerade das Ende des Gesprächs? Dann bleibt es sichtbar, auch wenn die Tastatur aufgeht
  const atEnd = useRef(true);
  const firstScroll = useRef(true);

  // Eingabefeld wächst mit längeren Antworten mit (bis ca. fünf Zeilen)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  // Handy: der Chat füllt genau den sichtbaren Bereich – geht die Tastatur auf, wird er kleiner statt verschoben,
  // und die Seite dahinter scrollt nicht mit
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const vv = window.visualViewport;
    const handy = window.matchMedia(HANDY);
    const root = document.documentElement;
    const fit = () => {
      if (handy.matches && vv) {
        root.classList.add("chat-offen");
        box.style.height = `${vv.height}px`;
        box.style.transform = `translateY(${vv.offsetTop}px)`;
      } else {
        root.classList.remove("chat-offen");
        box.style.height = "";
        box.style.transform = "";
      }
    };
    fit();
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    handy.addEventListener("change", fit);
    return () => {
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      handy.removeEventListener("change", fit);
      root.classList.remove("chat-offen");
    };
  }, []);

  // Wird der Nachrichtenbereich kleiner oder größer (Tastatur, längere Eingabe): wer am Ende war, bleibt am Ende
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const keep = new ResizeObserver(() => {
      if (atEnd.current) list.scrollTop = list.scrollHeight;
    });
    keep.observe(list);
    return () => keep.disconnect();
  }, []);

  // Neue Nachricht: nur im Chat scrollen, nie die ganze Seite. Eine lange Antwort der Gastgeberin
  // nur bis zu ihrem Anfang, damit man sie von oben lesen kann.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = list.querySelectorAll<HTMLElement>("[data-msg]");
    const last = items[items.length - 1];
    const end = list.scrollHeight - list.clientHeight;
    const top = last?.dataset.msg === "assistant" && !sending ? Math.min(end, last.offsetTop - 12) : end;
    atEnd.current = top >= end - 4;
    list.scrollTo({ top, behavior: firstScroll.current ? "auto" : "smooth" });
    firstScroll.current = false;
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
    <section
      ref={boxRef}
      className="fixed inset-x-0 top-0 z-50 flex h-dvh flex-col overflow-hidden bg-night-900 sm:static sm:z-auto sm:h-[min(75vh,720px)] sm:rounded-3xl sm:border sm:border-gold-400/15 sm:bg-night-800/60 sm:backdrop-blur-md"
    >
      <header className="flex items-start gap-4 border-b border-gold-400/10 px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl">{t.chat.title}</h1>
          <p className="text-sm text-mist">{t.chat.lead}</p>
        </div>
        {/* nur am Handy, wo der Chat die ganze Seite bedeckt */}
        <Link
          href={`/${lang}`}
          aria-label={t.chat.laterLabel}
          className="mt-1.5 shrink-0 text-[0.68rem] font-medium tracking-[0.18em] text-mist uppercase hover:text-gold-300 sm:hidden"
        >
          {t.chat.later}
        </Link>
      </header>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="relative flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-5"
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <div key={i} data-msg={m.role} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed whitespace-pre-wrap ${
                m.role === "user" ? "rounded-br-sm bg-gold-400 text-night-950" : "rounded-bl-sm bg-night-700 text-cloud"
              }`}
            >
              {m.content}
            </p>
          </div>
        ))}
        {sending && <p className="animate-pulse text-sm text-mist">{t.chat.typing}</p>}
      </div>
      {error && <p className="px-4 pb-2 text-sm text-gold-300">{error}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-gold-400/10 p-3">
        <textarea
          ref={inputRef}
          rows={1}
          maxLength={1200}
          value={text}
          disabled={finished}
          enterKeyHint="send"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) send(e);
          }}
          placeholder={t.chat.placeholder}
          className={`${inputClass} resize-none text-base`}
          aria-label={t.chat.placeholder}
        />
        {/* Fokus bleibt im Eingabefeld – so bleibt die Tastatur offen und nichts springt */}
        <button
          type="submit"
          onPointerDown={(e) => e.preventDefault()}
          disabled={sending || finished || !text.trim()}
          className="rounded-full bg-gold-400 px-5 py-3 font-semibold text-night-950 transition hover:bg-gold-300 disabled:opacity-50"
        >
          {t.chat.send}
        </button>
      </form>
    </section>
  );
}

/** „Bring eine Freundin / einen Freund mit“: persönlicher Link, über den sich jemand als Duo bewirbt. */
export function InviteBox({ t, lang, code, gender = null }: { t: T["buddy"]; lang: string; code: string; gender?: string | null }) {
  const [copied, setCopied] = useState(false);
  // Immer die offizielle Domain – auch wenn die Seite über eine Vercel-Vorschau aufgerufen wird
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  const url = `${origin}/${lang}/bewerben?mit=${code}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${t.shareText} ${url}`)}`;

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Tisch6", text: t.shareText, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="mt-8 rounded-2xl border border-gold-400/30 bg-gold-400/5 p-5 text-left">
      <h2 className="font-display text-lg font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-mist">{fill(t.text, { bring: gender === "frau" ? t.bring.frau : gender === "mann" ? t.bring.mann : t.bring.offen })}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} className={`${inputClass} text-sm`} onFocus={(e) => e.target.select()} aria-label={t.title} />
        <button type="button" onClick={share} className="shrink-0 rounded-full bg-gold-400 px-5 py-3 font-semibold text-night-950 hover:bg-gold-300">
          {copied ? t.copied : t.share}
        </button>
      </div>
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-gold-300 underline hover:text-cloud">
        {t.whatsapp}
      </a>
      <p className="mt-3 text-sm text-gold-300">{t.wanted}</p>
    </div>
  );
}

/** Verkleinert das Foto im Browser und speichert es neu als JPEG – entfernt dabei auch Metadaten wie GPS. */
async function toJpeg(file: File, maxSide = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))), "image/jpeg", 0.85),
  );
}

/** Das eine Pflichtfoto – nur für die Verifizierung durch das Tisch6-Team. */
function PhotoStep({ t, onDone }: { t: T["photo"]; onDone: () => void }) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const jpeg = await toJpeg(file);
      setBlob(jpeg);
      setPreview(URL.createObjectURL(jpeg));
    } catch {
      setError(t.unreadable);
    }
  }

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!blob) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("photo", blob, "foto.jpg");
    const res = await fetch("/api/photo", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? t.unreadable);
    onDone();
  }

  return (
    <form onSubmit={upload} className="glass space-y-5 rounded-3xl p-6 sm:p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.title}</h1>
        <p className="mt-2 text-mist">{t.lead}</p>
      </div>
      <ul className="space-y-1.5 text-sm text-mist">
        {t.points.map((point) => (
          <li key={point} className="flex gap-2">
            <span className="text-gold-400">✓</span>
            {point}
          </li>
        ))}
      </ul>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 p-6 text-center transition hover:border-gold-400/60">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokale Vorschau (blob:-URL)
          <img src={preview} alt={t.previewAlt} className="h-48 w-48 rounded-2xl object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-night-700 text-3xl text-gold-400">+</span>
        )}
        <span className="text-sm font-medium">{preview ? t.change : t.choose}</span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {error && <p role="alert" className="text-sm text-gold-300">{error}</p>}
      <button type="submit" disabled={!blob || busy} className={buttonClass}>
        {busy ? t.uploading : t.upload}
      </button>
    </form>
  );
}
