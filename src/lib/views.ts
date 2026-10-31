import "server-only";
import { TIMING } from "./config";
import {
  type Application,
  type ApplicationStatus,
  type ConversationCard,
  type Db,
  type DinnerStatus,
  type Feedback,
  type Seat,
  type SeatStatus,
  OPEN_SEAT,
  must,
} from "./db";
import { tableSummary, type Gender } from "./matching-core";
import { teamAppToken } from "./push";
import { loadApplication, loadDinner, offerFor } from "./seats";
import { stripe } from "./stripe";
import { DAY, HOUR, dateKey, viennaDate } from "./time";

const TOKEN = /^[a-f0-9]{32}$/;

export async function seatByToken(db: Db, token: string) {
  if (!TOKEN.test(token)) return null;
  return ((await db.from("seats").select("*").eq("token", token).maybeSingle()).data as Seat | null) ?? null;
}

export type SeatView = {
  token: string;
  status: SeatStatus;
  replacement: boolean;
  firstName: string;
  dinnerStatus: DinnerStatus;
  startsAt: string;
  expiresAt: string | null;
  restaurant: { name: string; district: string | null; address: string | null; mapsUrl: string | null };
  table: string;
  members: { id: string; firstName: string }[];
  offer: { packageRemaining: number | null; packageIsFounder: boolean; priceCents: number; discounted: boolean; founderAvailable: boolean } | null;
  paymentsEnabled: boolean;
  canCancel: boolean;
  cancelFree: boolean;
  /** vom Team verschoben, nachdem die Person zugesagt hatte – Absage kostenlos */
  cancelMovedFree: boolean;
  freeCancelUntil: string;
  /** Gesprächskarte des Tisches – am Tag des Abends */
  card: ConversationCard | null;
  cardSoon: boolean;
  canReport: boolean;
  canFeedback: boolean;
  feedbackDone: boolean;
  /** Schlüssel der persönlichen App-Seite (/de/app/…) */
  appToken: string;
};

/** Alles, was die Einladungsseite braucht – und nur das, was die Person sehen darf. */
export async function seatView(db: Db, token: string): Promise<SeatView | null> {
  const seat = await seatByToken(db, token);
  if (!seat) return null;
  const app = await loadApplication(db, seat.application_id);
  const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
  const start = new Date(dinner.starts_at).getTime();
  const now = Date.now();

  const tableSeats = must(await db.from("seats").select("*").eq("dinner_id", dinner.id), "Plätze laden") as Seat[];
  const counted = tableSeats.filter((s) => [...OPEN_SEAT, "attended", "no_show"].includes(s.status));
  const people = must(
    await db.from("applications").select("id, first_name, profile").in("id", counted.map((s) => s.application_id)),
    "Runde laden",
  ) as Pick<Application, "id" | "first_name" | "profile">[];

  const isGuest = ["confirmed", "attended", "no_show"].includes(seat.status);
  const dinnerDay = dateKey(viennaDate(new Date(now))) === dateKey(viennaDate(new Date(start)));
  const open = (seat.status === "invited" || seat.status === "offered") && (!seat.expires_at || new Date(seat.expires_at).getTime() > now);
  const offer = open ? await offerFor(db, app) : null;
  const feedback = (await db.from("feedback").select("seat_id").eq("seat_id", seat.id).maybeSingle()).data as Pick<Feedback, "seat_id"> | null;

  return {
    token: seat.token,
    status: open || !["invited", "offered"].includes(seat.status) ? seat.status : "expired",
    replacement: seat.replacement,
    firstName: app.first_name,
    dinnerStatus: dinner.status,
    startsAt: dinner.starts_at,
    expiresAt: seat.expires_at,
    restaurant: {
      name: restaurant.name,
      district: restaurant.district,
      address: isGuest ? restaurant.address : null,
      mapsUrl: isGuest ? (restaurant.maps_url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name}, ${restaurant.address}`)}`) : null,
    },
    table: tableSummary(
      people
        .filter((p) => (p.profile?.geschlecht === "frau" || p.profile?.geschlecht === "mann") && p.profile.alter)
        .map((p) => ({ gender: p.profile!.geschlecht as Gender, age: p.profile!.alter! })),
    ),
    // Vornamen erst kurz vor dem Abend – für Meldeknopf und Wiedersehen
    members:
      isGuest && now >= start - TIMING.reportFromHoursBefore * HOUR
        ? people.filter((p) => p.id !== app.id).map((p) => ({ id: p.id, firstName: p.first_name }))
        : [],
    offer: offer
      ? {
          packageRemaining: offer.package?.remaining ?? null,
          packageIsFounder: offer.package?.kind === "founder",
          priceCents: offer.priceCents,
          discounted: Boolean(offer.discount),
          founderAvailable: offer.founderAvailable,
        }
      : null,
    paymentsEnabled: Boolean(stripe()),
    canCancel: seat.status === "confirmed" && now < start,
    cancelFree: start - now >= TIMING.freeCancelHoursBefore * HOUR,
    cancelMovedFree: Boolean(dinner.moved_at && (!seat.confirmed_at || seat.confirmed_at < dinner.moved_at)),
    freeCancelUntil: new Date(start - TIMING.freeCancelHoursBefore * HOUR).toISOString(),
    card: seat.status === "confirmed" && dinnerDay ? dinner.conversation_card : null,
    cardSoon: seat.status === "confirmed" && (!dinnerDay || !dinner.conversation_card),
    canReport: isGuest && now >= start - TIMING.reportFromHoursBefore * HOUR && now <= start + TIMING.reportUntilDaysAfter * DAY,
    canFeedback: seat.status === "attended" && now <= start + TIMING.reportUntilDaysAfter * DAY,
    feedbackDone: Boolean(feedback),
    appToken: app.magic_token,
  };
}

/** Wem ein App-Link gehört: einem Gast oder dem Tisch6-Team (id null). Gesperrte Profile bekommen keine App. */
export type AppOwner = { id: string | null; firstName: string; status: ApplicationStatus | null };

export async function appOwner(db: Db, token: string): Promise<AppOwner | null> {
  if (!TOKEN.test(token)) return null;
  if (token === (await teamAppToken(db))) return { id: null, firstName: "Team", status: null };
  const app = (await db.from("applications").select("id, first_name, status").eq("magic_token", token).maybeSingle()).data as Pick<
    Application,
    "id" | "first_name" | "status"
  > | null;
  return app && app.status !== "blocked" ? { id: app.id, firstName: app.first_name, status: app.status } : null;
}

/** Stand der Bewerbung – zeigt die App, solange kein Tisch geplant ist */
export type AppStage = "review" | "waitlist" | "accepted" | "closed";
const APP_STAGE: Partial<Record<ApplicationStatus, AppStage>> = { submitted: "review", waitlist: "waitlist", accepted: "accepted", rejected: "closed" };

export type AppView = {
  token: string;
  firstName: string;
  stage: AppStage | null;
  next: { token: string; status: SeatStatus; startsAt: string } | null;
};

/** Persönliche App-Seite: Vorname, Stand der Bewerbung und der nächste Tisch – der Link aus der E-Mail ist der Schlüssel. */
export async function appView(db: Db, token: string): Promise<AppView | null> {
  const owner = await appOwner(db, token);
  if (!owner) return null;
  if (!owner.id) return { token, firstName: owner.firstName, stage: null, next: null };
  const { data } = await db
    .from("seats")
    .select("token, status, dinners!inner(starts_at)")
    .eq("application_id", owner.id)
    .in("status", OPEN_SEAT)
    .gte("dinners.starts_at", new Date(Date.now() - 6 * HOUR).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  const next = (data?.[0] as unknown as { token: string; status: SeatStatus; dinners: { starts_at: string } } | undefined) ?? null;
  return {
    token,
    firstName: owner.firstName,
    stage: (owner.status && APP_STAGE[owner.status]) ?? null,
    next: next ? { token: next.token, status: next.status, startsAt: next.dinners.starts_at } : null,
  };
}

export type FeedbackView = {
  token: string;
  firstName: string;
  startsAt: string;
  restaurant: string;
  open: boolean;
  members: { id: string; firstName: string }[];
  saved: Pick<Feedback, "rating_evening" | "rating_table" | "improve" | "wants_to_see" | "absent" | "share_phone" | "quote" | "quote_ok"> | null;
};

export async function feedbackView(db: Db, token: string): Promise<FeedbackView | null> {
  const seat = await seatByToken(db, token);
  if (!seat) return null;
  const app = await loadApplication(db, seat.application_id);
  const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
  const others = must(
    await db.from("seats").select("application_id").eq("dinner_id", dinner.id).in("status", ["attended", "confirmed", "no_show"]).neq("id", seat.id),
    "Runde laden",
  ) as { application_id: string }[];
  const members = must(
    await db.from("applications").select("id, first_name").in("id", others.map((o) => o.application_id)),
    "Namen laden",
  ) as Pick<Application, "id" | "first_name">[];
  const saved = (await db.from("feedback").select("*").eq("seat_id", seat.id).maybeSingle()).data as Feedback | null;
  const start = new Date(dinner.starts_at).getTime();
  return {
    token,
    firstName: app.first_name,
    startsAt: dinner.starts_at,
    restaurant: restaurant.name,
    open: seat.status === "attended" && Date.now() <= start + TIMING.reportUntilDaysAfter * DAY,
    members: members.map((m) => ({ id: m.id, firstName: m.first_name })),
    saved,
  };
}
