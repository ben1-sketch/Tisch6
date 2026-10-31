import "server-only";
import { TIMING } from "./config";
import { type Application, type Db, type Notification, type Seat, must } from "./db";
import { ACCEPTED_PUSH, appUrl, invitationPush, seatUrl } from "./messages";
import { appPush, sendPush } from "./notify";
import { ADMIN_PUSH_ICON, pushDevices } from "./push";
import { dinnerInfo, loadDinner } from "./seats";
import { HOUR, viennaHour } from "./time";

/**
 * Neuigkeiten zusätzlich als Nachricht an die Tisch6-App: „Du bist dabei“ und neue Einladungen.
 * Nur tagsüber – die Tischplanung läuft nachts, ihre Einladungen kommen am Morgen aufs Handy.
 * Nur an Gäste mit eingeschalteter App, jede Neuigkeit höchstens einmal (Doppelversand-Schutz).
 */
export async function sendAppNews(db: Db, now = new Date(), send = appPush) {
  const hour = viennaHour(now);
  if (hour < TIMING.daytimeFromHour || hour >= TIMING.daytimeToHour) return { skipped: "nachts" };

  const devices = must(await db.from("push_subscriptions").select("application_id").not("application_id", "is", null), "Geräte laden") as {
    application_id: string;
  }[];
  const ids = [...new Set(devices.map((d) => d.application_id))];
  if (!ids.length) return { gesendet: 0 };
  const since = new Date(now.getTime() - 24 * HOUR).toISOString();

  type News = { key: string; applicationId: string; kind: string; body: () => Promise<string>; url: string };
  const news: News[] = [];

  // angenommen in den letzten 24 Stunden
  const accepted = must(
    await db.from("applications").select("id, magic_token").eq("status", "accepted").gte("accepted_at", since).in("id", ids),
    "Zusagen laden",
  ) as Pick<Application, "id" | "magic_token">[];
  for (const app of accepted) {
    news.push({ key: `accepted:${app.id}`, applicationId: app.id, kind: "accepted", body: async () => ACCEPTED_PUSH, url: appUrl(app.magic_token) });
  }

  // neue Einladungen (Nachrücker bekommen ihre Nachricht schon sofort, siehe sendInvitation)
  const seats = must(
    await db
      .from("seats")
      .select("*")
      .eq("status", "invited")
      .eq("replacement", false)
      .gte("created_at", since)
      .gt("expires_at", new Date(now.getTime() + HOUR).toISOString())
      .in("application_id", ids),
    "Einladungen laden",
  ) as Seat[];
  for (const seat of seats) {
    news.push({
      key: `invite:${seat.id}`,
      applicationId: seat.application_id,
      kind: "invitation",
      body: async () => {
        const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
        return invitationPush({ dinner: dinnerInfo(dinner, restaurant), deadline: new Date(seat.expires_at!) });
      },
      url: seatUrl(seat.token),
    });
  }
  if (!news.length) return { gesendet: 0 };

  // schon verschickte überspringen
  const done = must(
    await db.from("notifications").select("dedupe_key").in("dedupe_key", news.map((n) => `${n.key}:push`)),
    "Versand prüfen",
  ) as { dedupe_key: string }[];
  const sent = new Set(done.map((d) => d.dedupe_key));

  let gesendet = 0;
  for (const n of news) {
    if (sent.has(`${n.key}:push`)) continue;
    const result = await send(db, { applicationId: n.applicationId, body: await n.body(), url: n.url, kind: n.kind, dedupeKey: n.key });
    if (result === "sent") gesendet++;
  }
  return { gesendet };
}

/**
 * Hinweise ans Team (dieselben wie per E-Mail an ADMIN_EMAIL) zusätzlich als Nachricht an die Admin-App –
 * rund um die Uhr (Wunsch des Inhabers). Erst ab dem ersten eingeschalteten Team-Gerät, jeder Hinweis einmal.
 */
export async function sendAdminNews(db: Db, now = new Date(), send = sendPush) {
  const to = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!to) return { skipped: "ADMIN_EMAIL fehlt" };

  const devices = await pushDevices(db, null);
  if (!devices.length) return { gesendet: 0 };
  const firstDevice = Math.min(...devices.map((d) => new Date(d.created_at).getTime()));
  const since = new Date(Math.max(now.getTime() - 24 * HOUR, firstDevice)).toISOString();

  const rows = must(
    await db
      .from("notifications")
      .select("id, kind, subject, recipient")
      .eq("channel", "email")
      .is("application_id", null)
      .neq("kind", "test")
      .gte("created_at", since)
      .order("created_at"),
    "Hinweise laden",
  ) as Pick<Notification, "id" | "kind" | "subject" | "recipient">[];
  const notes = rows.filter((r) => r.recipient.trim().toLowerCase() === to);
  if (!notes.length) return { gesendet: 0 };

  const key = (id: string) => `admin:${id}:push`;
  const done = must(await db.from("notifications").select("dedupe_key").in("dedupe_key", notes.map((r) => key(r.id))), "Versand prüfen") as {
    dedupe_key: string;
  }[];
  const sent = new Set(done.map((d) => d.dedupe_key));

  let gesendet = 0;
  for (const note of notes) {
    if (sent.has(key(note.id))) continue;
    const result = await send(db, {
      applicationId: null,
      title: "Tisch6 Admin",
      body: (note.subject ?? "Neuer Hinweis").replace(/^\[Tisch6\]\s*/, ""),
      url: "/admin",
      kind: note.kind,
      dedupeKey: key(note.id),
      icon: ADMIN_PUSH_ICON,
    });
    if (result === "sent") gesendet++;
  }
  return { gesendet };
}
