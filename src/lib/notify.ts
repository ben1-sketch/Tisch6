import "server-only";
import type { Db } from "./db";

/** headers: zusätzliche Kopfzeilen der E-Mail, z. B. List-Unsubscribe bei Aufrufen */
export type EmailContent = { subject: string; html: string; text: string; headers?: Record<string, string> };
export type SendResult = "sent" | "logged" | "duplicate" | "failed" | "retry";

/**
 * Reserviert den Versand im Protokoll. Gibt es den Schlüssel schon, wurde die Nachricht
 * bereits verschickt – so geht auch bei wiederholten Durchläufen nichts doppelt raus.
 */
async function reserve(
  db: Db,
  row: { channel: "email" | "sms"; kind: string; dedupe_key: string | null; recipient: string; subject?: string; application_id: string | null },
) {
  const { data, error } = await db.from("notifications").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(`Versandprotokoll: ${error.message}`);
  }
  return data.id as string;
}

async function finish(db: Db, id: string, ok: boolean, transient: boolean, detail: string | null, logged = false): Promise<SendResult> {
  if (logged) {
    await db.from("notifications").update({ status: "logged" }).eq("id", id);
    return "logged";
  }
  if (ok) {
    await db.from("notifications").update({ status: "sent", provider_id: detail }).eq("id", id);
    return "sent";
  }
  if (transient) {
    // Vorübergehender Fehler: Reservierung freigeben, der nächste Durchlauf versucht es erneut
    await db.from("notifications").delete().eq("id", id);
    return "retry";
  }
  await db.from("notifications").update({ status: "failed", error: detail?.slice(0, 500) }).eq("id", id);
  return "failed";
}

export async function sendEmail(
  db: Db,
  options: { to: string; content: EmailContent; kind: string; dedupeKey?: string; applicationId?: string | null },
): Promise<SendResult> {
  const id = await reserve(db, {
    channel: "email",
    kind: options.kind,
    dedupe_key: options.dedupeKey ?? null,
    recipient: options.to,
    subject: options.content.subject,
    application_id: options.applicationId ?? null,
  });
  if (!id) return "duplicate";

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[E-Mail nicht verschickt – RESEND_API_KEY fehlt] an ${options.to}: ${options.content.subject}\n${options.content.text}`);
    return finish(db, id, false, false, null, true);
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(options.dedupeKey ? { "Idempotency-Key": options.dedupeKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Tisch6 <onboarding@resend.dev>",
        to: [options.to],
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: options.content.subject,
        html: options.content.html,
        text: options.content.text,
        headers: options.content.headers,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return finish(db, id, true, false, body.id ?? null);
    console.error("Resend-Fehler", res.status, body);
    return finish(db, id, false, res.status >= 500 || res.status === 429, JSON.stringify(body));
  } catch (e) {
    console.error("Resend nicht erreichbar", e);
    return finish(db, id, false, true, String(e));
  }
}

/**
 * SMS über Twilio. Texte bitte ohne typografische Anführungszeichen und Gedankenstriche halten –
 * sonst wird die SMS im teureren Unicode-Format verschickt (Umlaute sind unproblematisch).
 */
export async function sendSms(
  db: Db,
  options: { to: string | null; body: string; kind: string; dedupeKey?: string; applicationId?: string | null },
): Promise<SendResult> {
  if (!options.to) return "failed";
  const to = options.to.startsWith("+") ? options.to : `+${options.to}`;
  const id = await reserve(db, {
    channel: "sms",
    kind: options.kind,
    dedupe_key: options.dedupeKey ?? null,
    recipient: to,
    application_id: options.applicationId ?? null,
  });
  if (!id) return "duplicate";

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || !(service || process.env.TWILIO_FROM)) {
    console.info(`[SMS nicht verschickt – Twilio nicht eingerichtet] an ${to}: ${options.body}`);
    return finish(db, id, false, false, null, true);
  }

  const form = new URLSearchParams({ To: to, Body: options.body });
  if (service) form.set("MessagingServiceSid", service);
  else form.set("From", process.env.TWILIO_FROM!);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return finish(db, id, true, false, body.sid ?? null);
    console.error("Twilio-Fehler", res.status, body);
    return finish(db, id, false, res.status >= 500 || res.status === 429, JSON.stringify(body));
  } catch (e) {
    console.error("Twilio nicht erreichbar", e);
    return finish(db, id, false, true, String(e));
  }
}

/** Interne Hinweise an das Tisch6-Team (ADMIN_EMAIL) */
export async function notifyAdmin(db: Db, content: EmailContent, kind: string, dedupeKey?: string) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    console.warn(`[Admin-Hinweis – ADMIN_EMAIL fehlt] ${content.subject}\n${content.text}`);
    return "logged" as const;
  }
  return sendEmail(db, { to, content, kind, dedupeKey });
}
