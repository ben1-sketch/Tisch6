import "server-only";
import { randomBytes } from "node:crypto";
import webpush from "web-push";
import { type Db, must } from "./db";

/**
 * Ein Gerät, auf dem jemand in der Tisch6-App Benachrichtigungen eingeschaltet hat.
 * application_id leer = Gerät des Tisch6-Teams (zum Testen der App).
 */
export type PushDevice = {
  id: string;
  created_at: string;
  application_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  last_sent_at: string | null;
};

/** So schickt der Browser ein Abo (PushSubscription.toJSON) */
export type PushSubscriptionJson = { endpoint: string; keys: { p256dh: string; auth: string } };

export const VAPID_SUBJECT = "mailto:info@tisch6.at";

/** Geheimnis aus app_secrets – beim ersten Gebrauch erzeugt und danach nie mehr geändert. */
async function secret(db: Db, name: string, create: () => string) {
  const load = async () =>
    must(await db.from("app_secrets").select("value").eq("name", name).maybeSingle(), "Geheimnis laden") as { value: string } | null;
  let row = await load();
  if (!row) {
    // Laufen zwei Aufrufe gleichzeitig, gewinnt der erste – danach lesen alle denselben Wert
    await db.from("app_secrets").upsert({ name, value: create() }, { onConflict: "name", ignoreDuplicates: true });
    row = await load();
  }
  if (!row) throw new Error(`Geheimnis „${name}“ fehlt`);
  return row.value;
}

/**
 * Schlüsselpaar für Web-Push (VAPID). Liegt nur in der Datenbank.
 * Ein neues Paar würde alle eingeschalteten Geräte stumm schalten – darum nie überschreiben.
 */
export async function vapidKeys(db: Db): Promise<{ publicKey: string; privateKey: string }> {
  return JSON.parse(await secret(db, "vapid", () => JSON.stringify(webpush.generateVAPIDKeys())));
}

/** Schlüssel der Team-App: Damit testet das Tisch6-Team die App auf dem eigenen Handy. */
export function teamAppToken(db: Db) {
  return secret(db, "team_app_token", () => randomBytes(16).toString("hex"));
}

/** Geräte eines Gastes – oder des Teams (applicationId null) */
export async function pushDevices(db: Db, applicationId: string | null) {
  const q = db.from("push_subscriptions").select("*");
  return must(await (applicationId ? q.eq("application_id", applicationId) : q.is("application_id", null)), "Geräte laden") as PushDevice[];
}

/** Höchstens so viele Geräte pro Person – ältere fallen beim Eintragen eines neuen weg. */
const MAX_DEVICES = 5;

/** Gerät eintragen – meldet sich dasselbe Gerät neu an, wird der Eintrag aktualisiert. */
export async function savePushDevice(db: Db, applicationId: string | null, sub: PushSubscriptionJson, userAgent: string | null) {
  must(
    await db.from("push_subscriptions").upsert(
      { application_id: applicationId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: userAgent?.slice(0, 300) ?? null },
      { onConflict: "endpoint" },
    ),
    "Gerät speichern",
  );
  const devices = await pushDevices(db, applicationId);
  const older = devices.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(MAX_DEVICES);
  if (older.length) must(await db.from("push_subscriptions").delete().in("id", older.map((d) => d.id)), "Alte Geräte entfernen");
}

/** Gerät austragen – mit owner nur, wenn es dieser Person (bzw. dem Team) gehört. */
export async function removePushDevice(db: Db, endpoint: string, owner?: { applicationId: string | null }) {
  let q = db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (owner) q = owner.applicationId ? q.eq("application_id", owner.applicationId) : q.is("application_id", null);
  must(await q, "Gerät entfernen");
}
