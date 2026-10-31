import "server-only";
import webpush, { WebPushError } from "web-push";
import type { Db } from "./db";
import { VAPID_SUBJECT, pushDevices, removePushDevice, vapidKeys } from "./push";

/** headers: zusätzliche Kopfzeilen der E-Mail, z. B. List-Unsubscribe bei Aufrufen */
export type EmailContent = { subject: string; html: string; text: string; headers?: Record<string, string> };
export type SendResult = "sent" | "logged" | "duplicate" | "failed" | "retry";

/**
 * Reserviert den Versand im Protokoll. Gibt es den Schlüssel schon, wurde die Nachricht
 * bereits verschickt – so geht auch bei wiederholten Durchläufen nichts doppelt raus.
 */
async function reserve(
  db: Db,
  row: { channel: "email" | "sms" | "push"; kind: string; dedupe_key: string | null; recipient: string; subject?: string; application_id: string | null },
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

/**
 * Push-Nachricht an alle Geräte, auf denen der Gast (applicationId null: das Team) in der Tisch6-App Benachrichtigungen eingeschaltet hat.
 * "none": kein Gerät – dann wird auch nichts protokolliert. Antwortet ein Gerät mit 404/410, hat der Gast
 * die Benachrichtigungen abgeschaltet oder die App gelöscht; der Eintrag wird dann entfernt.
 */
export async function sendPush(
  db: Db,
  options: { applicationId: string | null; title: string; body: string; url: string; kind: string; dedupeKey?: string | null },
): Promise<SendResult | "none"> {
  const devices = await pushDevices(db, options.applicationId);
  if (!devices.length) return "none";
  const id = await reserve(db, {
    channel: "push",
    kind: options.kind,
    dedupe_key: options.dedupeKey ?? null,
    recipient: devices.length === 1 ? "1 Gerät" : `${devices.length} Geräte`,
    subject: options.body.slice(0, 200),
    application_id: options.applicationId,
  });
  if (!id) return "duplicate";

  const { publicKey, privateKey } = await vapidKeys(db);
  const payload = JSON.stringify({ title: options.title, body: options.body, url: options.url });
  let delivered = 0;
  let lastError: string | null = null;
  for (const device of devices) {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, {
        vapidDetails: { subject: VAPID_SUBJECT, publicKey, privateKey },
        TTL: 12 * 3600,
        urgency: "high",
      });
      delivered++;
      await db.from("push_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("id", device.id);
    } catch (e) {
      const status = e instanceof WebPushError ? e.statusCode : null;
      if (status === 404 || status === 410) await removePushDevice(db, device.endpoint);
      else lastError = status ? `Push-Dienst antwortet mit ${status}` : String(e);
    }
  }
  if (delivered) return finish(db, id, true, false, null);
  return finish(db, id, false, false, lastError ?? "Kein Gerät mehr erreichbar – der Gast hat die Benachrichtigungen abgeschaltet.");
}

/** SMS-Text als Push: „Tisch6:“ steht schon als Titel da, und den Link öffnet ein Tippen auf die Nachricht. */
function pushText(sms: string) {
  return sms
    .replace(/^Tisch6:\s*/, "")
    .replace(/:?\s*https?:\/\/\S+$/, ".")
    .trim();
}

/**
 * Kurznachricht aufs Handy: als Push an die Tisch6-App, wenn der Gast sie eingeschaltet hat –
 * sonst (oder wenn kein Gerät erreichbar ist) als SMS.
 */
export async function sendPushOrSms(
  db: Db,
  options: { to: string | null; body: string; url: string; kind: string; dedupeKey: string; applicationId: string },
): Promise<SendResult> {
  const push = await sendPush(db, {
    applicationId: options.applicationId,
    title: "Tisch6",
    body: pushText(options.body),
    url: options.url,
    kind: options.kind,
    dedupeKey: `${options.dedupeKey}:push`,
  });
  if (push === "sent" || push === "duplicate") return push;
  return sendSms(db, options);
}

/**
 * Zusätzlich zur E-Mail eine Nachricht an die Tisch6-App – nur an eingeschaltete Geräte, nie als SMS.
 * Ein Fehler hier hält den Ablauf nicht auf: Die E-Mail ist schon unterwegs.
 * dedupeKey wie bei der E-Mail – „:push“ hängt diese Funktion an.
 */
export async function appPush(
  db: Db,
  o: { applicationId: string; body: string; url: string; kind: string; dedupeKey: string },
): Promise<SendResult | "none"> {
  try {
    return await sendPush(db, { applicationId: o.applicationId, title: "Tisch6", body: o.body, url: o.url, kind: o.kind, dedupeKey: `${o.dedupeKey}:push` });
  } catch (e) {
    console.error("Nachricht an die App", e);
    return "failed";
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
