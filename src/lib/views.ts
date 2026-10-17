import "server-only";
import { TIMING } from "./config";
import { type Application, type Db, type DinnerStatus, type Feedback, type Seat, type SeatStatus, OPEN_SEAT, must } from "./db";
import { tableSummary, type Gender } from "./matching-core";
import { loadApplication, loadDinner, offerFor } from "./seats";
import { stripe } from "./stripe";
import { DAY, HOUR } from "./time";

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
  freeCancelUntil: string;
  icebreaker: string[] | null;
  icebreakerSoon: boolean;
  canReport: boolean;
  canFeedback: boolean;
  feedbackDone: boolean;
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
    freeCancelUntil: new Date(start - TIMING.freeCancelHoursBefore * HOUR).toISOString(),
    icebreaker: seat.status === "confirmed" && start - now <= 24 * HOUR ? (seat.icebreaker?.fragen ?? null) : null,
    icebreakerSoon: seat.status === "confirmed" && start - now > 24 * HOUR,
    canReport: isGuest && now >= start - TIMING.reportFromHoursBefore * HOUR && now <= start + TIMING.reportUntilDaysAfter * DAY,
    canFeedback: seat.status === "attended" && now <= start + TIMING.reportUntilDaysAfter * DAY,
    feedbackDone: Boolean(feedback),
  };
}

export type FeedbackView = {
  token: string;
  firstName: string;
  startsAt: string;
  restaurant: string;
  open: boolean;
  members: { id: string; firstName: string }[];
  saved: Pick<Feedback, "rating_evening" | "rating_table" | "improve" | "wants_to_see" | "absent" | "share_phone"> | null;
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
