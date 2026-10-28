import "server-only";
import { z } from "zod";
import { askStructured } from "./claude";
import { NO_SHOW_LIMIT, NO_SHOW_VOTES, PRICES, TABLE, TIMING } from "./config";
import { type Application, type ConversationCard, type Db, type Dinner, type Feedback, type Seat, OPEN_SEAT, TAKING_PART, must } from "./db";
import {
  adminMail,
  dayOfMail,
  emergencySms,
  feedbackRequestMail,
  fivePersonMail,
  followUpMail,
  lebenszeichenMail,
  matchMail,
  noShowMail,
  referralRewardMail,
  reminder1dMail,
  reminder2hMail,
  reminder2hSms,
  reminder3dMail,
} from "./messages";
import { notifyAdmin, sendEmail, sendSms } from "./notify";
import { dinnerInfo, loadApplication, loadDinner, movedSuffix } from "./seats";
import type { Profile } from "./onboarding";
import { DAY, HOUR, dateKey, viennaDate, viennaHour } from "./time";

async function seatsOf(db: Db, dinnerId: string) {
  return must(await db.from("seats").select("*").eq("dinner_id", dinnerId), "Plätze laden") as Seat[];
}

async function applicationsByIds(db: Db, ids: string[]) {
  if (!ids.length) return [] as Application[];
  return must(await db.from("applications").select("*").in("id", ids), "Gäste laden") as Application[];
}

// ---------------------------------------------------------------------------
// Gesprächskarte: drei Runden für den ganzen Tisch – vom Aperitif bis zum Dessert
// ---------------------------------------------------------------------------

const CARD_ROUNDS = ["Runde 1 · Aperitif – leicht", "Runde 2 · Hauptgang – persönlicher", "Runde 3 · Dessert – tief"];

const CardSchema = z.object({
  runden: z.array(z.object({ fragen: z.array(z.string()) })).describe("Genau drei Runden in der Reihenfolge Aperitif, Hauptgang, Dessert"),
});

const CARD_SYSTEM = `Du schreibst die Gesprächskarte für einen Tisch6-Abend: sechs Singles an einem Tisch in Wien.
Die Karte hat drei Runden, die der Tisch nacheinander spielt – reihum beantwortet jede Person die Frage:
1. Aperitif, leicht – zum Warmwerden (Beispiel: "Was war dein bester Tag in diesem Jahr?")
2. Hauptgang, persönlicher – mit Geschichten (Beispiel: "Was würdest du gern können, was du nicht kannst?")
3. Dessert, tief – ehrlich und verbindend (Beispiel: "Wofür bist du gerade wirklich dankbar?")
Schreibe je Runde zwei Fragen, passend zu dieser Gruppe (Themen, Persönlichkeiten, Alter).
Regeln: Du-Form, höchstens 15 Wörter pro Frage, nichts über Ex-Partner, Geld, Politik oder Religion, nichts Peinliches, alle Fragen verschieden. Verrate nichts über einzelne Gäste.
Antworte im vorgegebenen JSON-Format.`;

const FALLBACK_CARD = [
  [
    "Was war dein bester Tag in diesem Jahr?",
    "Welcher Ort in Wien ist dein heimlicher Lieblingsplatz?",
    "Welche kleine Gewohnheit macht dich glücklich?",
    "Was steht ganz oben auf deiner Wien-Bucketlist?",
  ],
  [
    "Was würdest du gern können, was du nicht kannst?",
    "Was ist das Mutigste, das du je gemacht hast?",
    "Worüber hast du zuletzt deine Meinung geändert?",
    "Welches Essen erinnert dich an deine Kindheit?",
  ],
  [
    "Wofür bist du gerade wirklich dankbar?",
    "Was hat dich zu dem Menschen gemacht, der du heute bist?",
    "Wann hast du dich zuletzt so richtig lebendig gefühlt?",
    "Was wünschst du dir für die nächsten fünf Jahre?",
  ],
];

function fallbackCard(seed: string): ConversationCard {
  const n = [...seed].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return {
    runden: CARD_ROUNDS.map((name, i) => {
      const pool = FALLBACK_CARD[i];
      const first = (n + i) % pool.length;
      return { name, fragen: [pool[first], pool[(first + 1) % pool.length]] };
    }),
  };
}

/** Die KI wählt die Fragen passend zur Gruppe (ohne Namen); ohne Antwort gibt es eine Standardkarte. */
export async function ensureConversationCard(db: Db, dinner: Dinner, useAi = true): Promise<ConversationCard> {
  if (dinner.conversation_card?.runden?.length === 3) return dinner.conversation_card;
  const seats = (await seatsOf(db, dinner.id)).filter((s) => TAKING_PART.includes(s.status));
  const apps = await applicationsByIds(db, seats.map((s) => s.application_id));

  let card: ConversationCard | null = null;
  if (useAi && apps.length) {
    try {
      const user = apps
        .map((a, i) => {
          const p = a.profile;
          return `G${i + 1}: ${p?.alter ?? "?"} Jahre, Typ ${p?.persoenlichkeit.typ ?? "–"}, Themen ${p?.gespraechsthemen?.join(", ") || "–"}, begeistert von ${p?.begeistert_von?.join(", ") || "–"}`;
        })
        .join("\n");
      const result = await askStructured({ schema: CardSchema, system: CARD_SYSTEM, user, effort: "low", maxTokens: 2000 });
      if (result.runden.length >= 3 && result.runden.slice(0, 3).every((r) => r.fragen.length >= 2)) {
        card = { runden: CARD_ROUNDS.map((name, i) => ({ name, fragen: result.runden[i].fragen.slice(0, 2) })) };
      }
    } catch (e) {
      console.error("Gesprächskarte über KI fehlgeschlagen – nehme Standardfragen", e);
    }
  }
  card ??= fallbackCard(dinner.id);
  await db.from("dinners").update({ conversation_card: card }).eq("id", dinner.id).is("conversation_card", null);
  return card;
}

/** Karten für die fixen Tische der nächsten 36 Stunden vorbereiten – damit sie rechtzeitig gedruckt werden können */
export async function prepareCards(db: Db, deadline: number) {
  const now = Date.now();
  const dinners = must(
    await db
      .from("dinners")
      .select("*")
      .eq("status", "confirmed")
      .not("decided_at", "is", null)
      .is("conversation_card", null)
      .gt("starts_at", new Date(now).toISOString())
      .lte("starts_at", new Date(now + 36 * HOUR).toISOString()),
    "Tische für Gesprächskarten laden",
  ) as Dinner[];
  let prepared = 0;
  for (const dinner of dinners) {
    if (Date.now() > deadline - 15_000) break;
    await ensureConversationCard(db, dinner);
    prepared++;
  }
  return prepared;
}

/** Am Tag des Tisches: Gesprächskarte per E-Mail, Notfallnummer per SMS (EMERGENCY_PHONE) */
export async function sendDayOf(db: Db, deadline: number) {
  const now = new Date();
  if (viennaHour(now) < TIMING.dayOfHour) return 0;
  const today = dateKey(viennaDate(now));
  const dinners = must(
    await db
      .from("dinners")
      .select("*")
      .eq("status", "confirmed")
      .gt("starts_at", now.toISOString())
      .lte("starts_at", new Date(now.getTime() + DAY).toISOString()),
    "Heutige Tische laden",
  ) as Dinner[];
  const emergency = process.env.EMERGENCY_PHONE?.trim() || null;
  let sent = 0;
  for (const dinner of dinners) {
    if (dateKey(viennaDate(new Date(dinner.starts_at))) !== today) continue;
    if (Date.now() > deadline) break;
    const card = await ensureConversationCard(db, dinner, Date.now() < deadline - 20_000);
    const { restaurant } = await loadDinner(db, dinner.id);
    const info = dinnerInfo(dinner, restaurant);
    const suffix = movedSuffix(dinner);
    for (const seat of (await seatsOf(db, dinner.id)).filter((s) => s.status === "confirmed")) {
      const app = await loadApplication(db, seat.application_id);
      await sendEmail(db, {
        to: app.email,
        content: dayOfMail({ name: app.first_name, dinner: info, token: seat.token, card, emergency }),
        kind: "conversation_card",
        dedupeKey: `dayof:${seat.id}${suffix}`,
        applicationId: app.id,
      });
      if (emergency) {
        await sendSms(db, {
          to: app.phone,
          body: emergencySms({ dinner: info, phone: emergency }),
          kind: "emergency",
          dedupeKey: `notfall:${seat.id}${suffix}`,
          applicationId: app.id,
        });
      }
      sent++;
    }
  }
  return sent;
}

// ---------------------------------------------------------------------------
// Erinnerungen: drei Tage, einen Tag und zwei Stunden vorher – mit Adresse
// ---------------------------------------------------------------------------

export async function sendReminders(db: Db, deadline: number) {
  const now = Date.now();
  // auch Tische vor der Entscheidung – wer bezahlt hat, wird erinnert
  const dinners = must(
    await db
      .from("dinners")
      .select("*")
      .in("status", ["inviting", "confirmed"])
      .gt("starts_at", new Date(now).toISOString())
      .lte("starts_at", new Date(now + 3 * DAY).toISOString()),
    "Anstehende Dinner laden",
  ) as Dinner[];
  let sent = 0;
  for (const dinner of dinners) {
    if (Date.now() > deadline) break;
    const left = new Date(dinner.starts_at).getTime() - now;
    const { restaurant } = await loadDinner(db, dinner.id);
    const info = dinnerInfo(dinner, restaurant);
    const suffix = movedSuffix(dinner);
    const seats = (await seatsOf(db, dinner.id)).filter((s) => s.status === "confirmed");

    for (const seat of seats) {
      const app = await loadApplication(db, seat.application_id);
      const base = { applicationId: app.id };
      if (left <= 2 * HOUR) {
        // zwei Stunden vorher: E-Mail und SMS mit Adresse, Reservierungsname und Tipp fürs Ankommen
        await sendSms(db, { ...base, to: app.phone, body: reminder2hSms({ dinner: info }), kind: "reminder_2h", dedupeKey: `r2h_sms:${seat.id}${suffix}` });
        await sendEmail(db, {
          ...base,
          to: app.email,
          content: reminder2hMail({ name: app.first_name, dinner: info, token: seat.token }),
          kind: "reminder_2h",
          dedupeKey: `r2h:${seat.id}${suffix}`,
        });
      } else if (left <= DAY) {
        await sendEmail(db, {
          ...base,
          to: app.email,
          content: reminder1dMail({ name: app.first_name, dinner: info, token: seat.token }),
          kind: "reminder_1d",
          dedupeKey: `r1d:${seat.id}${suffix}`,
        });
      } else {
        await sendEmail(db, {
          ...base,
          to: app.email,
          content: reminder3dMail({ name: app.first_name, dinner: info, token: seat.token }),
          kind: "reminder_3d",
          dedupeKey: `r3d:${seat.id}${suffix}`,
        });
      }
      sent++;
    }
  }
  return sent;
}

// ---------------------------------------------------------------------------
// Nach dem Dinner
// ---------------------------------------------------------------------------

/** Empfehlungsprogramm: Die einladende Person zahlt beim nächsten Mal weniger. */
async function rewardReferral(db: Db, guest: Application) {
  if (!guest.referred_by || guest.referral_rewarded_at) return;
  const { error } = await db
    .from("discounts")
    .insert({ application_id: guest.referred_by, reason: "referral", price_cents: PRICES.referral, source_id: guest.id });
  await db.from("applications").update({ referral_rewarded_at: new Date().toISOString() }).eq("id", guest.id);
  if (error) return; // bereits gutgeschrieben
  const referrer = (await db.from("applications").select("*").eq("id", guest.referred_by).maybeSingle()).data as Application | null;
  if (referrer) {
    await sendEmail(db, {
      to: referrer.email,
      content: referralRewardMail(referrer.first_name),
      kind: "referral_reward",
      dedupeKey: `referral:${guest.id}`,
      applicationId: referrer.id,
    });
  }
}

/** Am Tag danach: Wiedersehen-Abfrage und Feedback; am dritten Tag: Abschluss des Abends. */
export async function afterDinners(db: Db, deadline: number) {
  const now = Date.now();
  const result = { feedbackRequests: 0, wrappedUp: 0 };

  const ended = must(
    await db
      .from("dinners")
      .select("*")
      .eq("status", "confirmed")
      .is("feedback_sent_at", null)
      .lte("starts_at", new Date(now - TIMING.feedbackHoursAfter * HOUR).toISOString()),
    "Vergangene Dinner laden",
  ) as Dinner[];
  for (const dinner of ended) {
    if (Date.now() > deadline) return result;
    await db.from("seats").update({ status: "attended" }).eq("dinner_id", dinner.id).eq("status", "confirmed");
    // offene Nachrücker-Angebote sind mit dem Abend hinfällig
    await db.from("seats").update({ status: "expired", ended_at: new Date().toISOString() }).eq("dinner_id", dinner.id).in("status", ["invited", "offered"]);
    const { data } = await db
      .from("dinners")
      .update({ status: "completed", feedback_sent_at: new Date().toISOString() })
      .eq("id", dinner.id)
      .eq("status", "confirmed")
      .select("id")
      .maybeSingle();
    if (!data) continue;
    const seats = (await seatsOf(db, dinner.id)).filter((s) => s.status === "attended");
    for (const seat of seats) {
      const app = await loadApplication(db, seat.application_id);
      await sendEmail(db, {
        to: app.email,
        content: feedbackRequestMail({ name: app.first_name, token: seat.token }),
        kind: "feedback_request",
        dedupeKey: `feedback:${seat.id}`,
        applicationId: app.id,
      });
    }
    result.feedbackRequests++;
  }

  const finished = must(
    await db
      .from("dinners")
      .select("*")
      .eq("status", "completed")
      .is("wrapped_up_at", null)
      .lte("starts_at", new Date(now - TIMING.wrapUpDaysAfter * DAY).toISOString()),
    "Abzuschließende Dinner laden",
  ) as Dinner[];
  for (const dinner of finished) {
    if (Date.now() > deadline) return result;
    await wrapUp(db, dinner);
    result.wrappedUp++;
  }
  return result;
}

/** Tag 3: Nichterscheinen auswerten, Fünfer-Rabatt, Folgeeinladung für alle ohne Match. */
async function wrapUp(db: Db, dinner: Dinner) {
  const { data } = await db.from("dinners").update({ wrapped_up_at: new Date().toISOString() }).eq("id", dinner.id).is("wrapped_up_at", null).select("id").maybeSingle();
  if (!data) return;
  const { restaurant } = await loadDinner(db, dinner.id);
  const info = dinnerInfo(dinner, restaurant);
  const seats = (await seatsOf(db, dinner.id)).filter((s) => s.status === "attended");
  const feedback = must(
    await db.from("feedback").select("*").in("seat_id", seats.map((s) => s.id)),
    "Feedback laden",
  ) as Feedback[];

  // „War nicht da“ – zählt ab zwei unabhängigen Angaben
  const votes = new Map<string, number>();
  for (const f of feedback) for (const id of new Set(f.absent)) votes.set(id, (votes.get(id) ?? 0) + 1);
  const present: Seat[] = [];
  for (const seat of seats) {
    if ((votes.get(seat.application_id) ?? 0) < NO_SHOW_VOTES) {
      present.push(seat);
      continue;
    }
    await db.from("seats").update({ status: "no_show" }).eq("id", seat.id);
    const app = await loadApplication(db, seat.application_id);
    const blocked = app.no_shows + 1 >= NO_SHOW_LIMIT;
    await db
      .from("applications")
      .update({
        no_shows: app.no_shows + 1,
        ...(blocked ? { status: "blocked", blocked_at: new Date().toISOString(), available_since: null, last_nudge_at: null } : {}),
      })
      .eq("id", app.id);
    await sendEmail(db, {
      to: app.email,
      content: noShowMail({ name: app.first_name, dinner: info, blocked }),
      kind: blocked ? "blocked" : "no_show",
      dedupeKey: `noshow:${seat.id}`,
      applicationId: app.id,
    });
  }

  // Empfehlungsprogramm: zählt erst, wenn die eingeladene Person wirklich am Tisch saß
  for (const seat of present) await rewardReferral(db, await loadApplication(db, seat.application_id));

  // Lief der Abend nicht vollzählig, bekommen alle Anwesenden Rabatt fürs nächste Mal
  if (present.length < TABLE.size) {
    for (const seat of present) {
      const { error } = await db
        .from("discounts")
        .insert({ application_id: seat.application_id, reason: "five_person", price_cents: PRICES.fivePerson, source_id: dinner.id });
      if (error) continue;
      const app = await loadApplication(db, seat.application_id);
      await sendEmail(db, { to: app.email, content: fivePersonMail(app.first_name), kind: "five_person", dedupeKey: `five:${seat.id}`, applicationId: app.id });
    }
  }

  // Ohne Match: freundliche Einladung zum nächsten Tisch mit Ein-Klick-Zusage
  const matches = must(await db.from("matches").select("a_id, b_id").eq("dinner_id", dinner.id), "Matches laden") as { a_id: string; b_id: string }[];
  const matched = new Set(matches.flatMap((m) => [m.a_id, m.b_id]));
  for (const seat of present) {
    if (matched.has(seat.application_id)) continue;
    const app = await loadApplication(db, seat.application_id);
    if (app.status !== "accepted" || app.available_since) continue;
    await db.from("applications").update({ last_nudge_at: new Date().toISOString() }).eq("id", app.id);
    await sendEmail(db, {
      to: app.email,
      content: followUpMail({ name: app.first_name, magicToken: app.magic_token, again: false }),
      kind: "follow_up",
      dedupeKey: `followup:${seat.id}`,
      applicationId: app.id,
    });
  }
}

// ---------------------------------------------------------------------------
// Wiedersehen & Feedback, Meldeknopf
// ---------------------------------------------------------------------------

export type FeedbackInput = {
  ratingEvening: number | null;
  ratingTable: number | null;
  improve: string;
  wantsToSee: string[];
  absent: string[];
  sharePhone: boolean;
  quote: string;
  quoteOk: boolean;
};

/** Speichert Wiedersehen und Feedback; bei beidseitigem Wunsch gehen die Kontakte an beide. */
export async function saveFeedback(db: Db, seat: Seat, input: FeedbackInput) {
  const tableSeats = (await seatsOf(db, seat.dinner_id)).filter((s) => ["attended", "confirmed", "no_show"].includes(s.status));
  const others = new Map(tableSeats.filter((s) => s.id !== seat.id).map((s) => [s.application_id, s]));
  const wants = [...new Set(input.wantsToSee)].filter((id) => others.has(id));
  const absent = [...new Set(input.absent)].filter((id) => others.has(id));

  must(
    await db.from("feedback").upsert({
      seat_id: seat.id,
      rating_evening: input.ratingEvening,
      rating_table: input.ratingTable,
      improve: input.improve.trim() || null,
      wants_to_see: wants,
      absent,
      share_phone: input.sharePhone,
      quote: input.quote.trim() || null,
      quote_ok: Boolean(input.quote.trim()) && input.quoteOk,
      updated_at: new Date().toISOString(),
    }),
    "Feedback speichern",
  );

  await recordAffinities(db, seat, wants);

  if (!wants.length) return;
  const theirFeedback = must(
    await db.from("feedback").select("*").in("seat_id", wants.map((id) => others.get(id)!.id)),
    "Gegenseitiges Feedback laden",
  ) as Feedback[];
  const me = await loadApplication(db, seat.application_id);
  for (const f of theirFeedback) {
    if (!f.wants_to_see.includes(seat.application_id)) continue;
    const otherSeat = tableSeats.find((s) => s.id === f.seat_id)!;
    const [a, b] = [seat.application_id, otherSeat.application_id].sort();
    const { data: match } = await db.from("matches").insert({ dinner_id: seat.dinner_id, a_id: a, b_id: b }).select("id").maybeSingle();
    if (!match) continue; // gibt es schon
    const other = await loadApplication(db, otherSeat.application_id);
    const phone = (app: Application, share: boolean) => (share && app.phone ? `+${app.phone.replace(/^\+/, "")}` : null);
    await sendEmail(db, {
      to: me.email,
      content: matchMail({ name: me.first_name, other: other.first_name, email: other.email, phone: phone(other, f.share_phone) }),
      kind: "match",
      dedupeKey: `match:${match.id}:${me.id}`,
      applicationId: me.id,
    });
    await sendEmail(db, {
      to: other.email,
      content: matchMail({ name: other.first_name, other: me.first_name, email: me.email, phone: phone(me, input.sharePhone) }),
      kind: "match",
      dedupeKey: `match:${match.id}:${other.id}`,
      applicationId: other.id,
    });
  }
}

const axesOf = (p: Profile | null | undefined) =>
  p
    ? [p.persoenlichkeit.ruhig_extrovertiert, p.persoenlichkeit.spontan_strukturiert, p.persoenlichkeit.humorvoll_ernst, p.persoenlichkeit.bodenstaendig_abenteuerlustig].map(
        (v) => Math.min(5, Math.max(1, Math.round(v || 3))),
      )
    : null;

/**
 * Lernendes Matching: hält fest, welche Typen diese Person wiedersehen will – als Momentaufnahme ohne Namen.
 * Beim nächsten Matching bevorzugt die KI Konstellationen, die bei ihr funktioniert haben.
 */
async function recordAffinities(db: Db, seat: Seat, wants: string[]) {
  const { error } = await db.from("affinities").delete().eq("dinner_id", seat.dinner_id).eq("from_id", seat.application_id);
  if (error) {
    console.error("Wiedersehen-Historie speichern", error.message);
    return;
  }
  if (!wants.length) return;
  const people = await applicationsByIds(db, [seat.application_id, ...wants]);
  const me = people.find((a) => a.id === seat.application_id);
  if (!me) return;
  const rows = people
    .filter((a) => a.id !== me.id)
    .map((other) => ({
      dinner_id: seat.dinner_id,
      from_id: me.id,
      to_id: other.id,
      from_typ: me.profile?.persoenlichkeit.typ ?? null,
      from_achsen: axesOf(me.profile),
      to_typ: other.profile?.persoenlichkeit.typ ?? null,
      to_achsen: axesOf(other.profile),
    }));
  const { error: insertError } = await db.from("affinities").insert(rows);
  if (insertError) console.error("Wiedersehen-Historie speichern", insertError.message);
}

/** Diskreter Meldeknopf: geht ans Team, das Profil wird bis zur Prüfung nicht mehr eingeladen. */
export async function reportPerson(db: Db, seat: Seat, reportedId: string, reason: string) {
  const tableSeats = await seatsOf(db, seat.dinner_id);
  if (reportedId === seat.application_id || !tableSeats.some((s) => s.application_id === reportedId)) return false;
  must(
    await db.from("reports").insert({ dinner_id: seat.dinner_id, reporter_id: seat.application_id, reported_id: reportedId, reason: reason.trim() || null }),
    "Meldung speichern",
  );
  await db.from("applications").update({ under_review: true }).eq("id", reportedId);
  const [reporter, reported] = await Promise.all([loadApplication(db, seat.application_id), loadApplication(db, reportedId)]);
  const { dinner, restaurant } = await loadDinner(db, seat.dinner_id);
  await notifyAdmin(
    db,
    adminMail("Neue Meldung vom Meldeknopf", [
      `Gemeldet: ${reported.first_name} (${reported.email}, ${reported.phone ? `+${reported.phone}` : "keine Nummer"})`,
      `Von: ${reporter.first_name} (${reporter.email}) – die gemeldete Person erfährt das nicht.`,
      `Dinner: ${restaurant.name}, ${new Date(dinner.starts_at).toLocaleString("de-AT", { timeZone: "Europe/Vienna" })}`,
      `Beschreibung: ${reason.trim() || "–"}`,
      "Das Profil wird bis zur Prüfung nicht mehr eingeladen.",
    ]),
    "admin_report",
  );
  return true;
}

// ---------------------------------------------------------------------------
// Lebenszeichen, Folgeeinladungen, Verfügbarkeit
// ---------------------------------------------------------------------------

async function seatedIds(db: Db) {
  const rows = must(await db.from("seats").select("application_id").in("status", OPEN_SEAT), "Offene Plätze laden") as { application_id: string }[];
  return new Set(rows.map((r) => r.application_id));
}

/** „Wir suchen noch die richtigen fünf für dich“ – nach sieben Tagen ohne Tisch, einmal pro Wartezeit. */
export async function sendLebenszeichen(db: Db) {
  const limit = new Date(Date.now() - TIMING.lebenszeichenDays * DAY).toISOString();
  const waiting = must(
    await db.from("applications").select("*").eq("status", "accepted").not("available_since", "is", null).lte("available_since", limit),
    "Wartende laden",
  ) as Application[];
  const seated = await seatedIds(db);
  let sent = 0;
  for (const app of waiting) {
    const since = new Date(app.available_since!).getTime();
    if (seated.has(app.id)) continue;
    if (app.lebenszeichen_at && new Date(app.lebenszeichen_at).getTime() >= since) continue;
    if (app.last_invited_at && new Date(app.last_invited_at).getTime() >= since) continue;
    await db.from("applications").update({ lebenszeichen_at: new Date().toISOString() }).eq("id", app.id);
    await sendEmail(db, {
      to: app.email,
      content: lebenszeichenMail(app.first_name),
      kind: "lebenszeichen",
      dedupeKey: `lebenszeichen:${app.id}:${app.available_since}`,
      applicationId: app.id,
    });
    sent++;
  }
  return sent;
}

/** Unbeantwortete Folgeeinladung: nach sieben Tagen erneut, nach zwei verpassten nur noch einmal im Monat. */
export async function sendNudges(db: Db) {
  const now = Date.now();
  const candidates = must(
    await db
      .from("applications")
      .select("*")
      .eq("status", "accepted")
      .is("available_since", null)
      .not("last_nudge_at", "is", null)
      .lte("last_nudge_at", new Date(now - TIMING.nudgeDays * DAY).toISOString()),
    "Folgeeinladungen laden",
  ) as Application[];
  const seated = await seatedIds(db);
  let sent = 0;
  for (const app of candidates) {
    if (seated.has(app.id)) continue;
    const wait = (app.missed_bookings >= 1 ? TIMING.monthlyDays : TIMING.nudgeDays) * DAY;
    if (now - new Date(app.last_nudge_at!).getTime() < wait) continue;
    const { data } = await db
      .from("applications")
      .update({ missed_bookings: app.missed_bookings + 1, last_nudge_at: new Date().toISOString() })
      .eq("id", app.id)
      .eq("last_nudge_at", app.last_nudge_at!)
      .select("id")
      .maybeSingle();
    if (!data) continue;
    await sendEmail(db, {
      to: app.email,
      content: followUpMail({ name: app.first_name, magicToken: app.magic_token, again: true }),
      kind: "nudge",
      dedupeKey: `nudge:${app.id}:${dateKey(viennaDate(new Date()))}`,
      applicationId: app.id,
    });
    sent++;
  }
  return sent;
}

/** Ein-Klick-Zusage „Ich bin wieder dabei“ bzw. Schalter im Konto */
export async function setAvailability(db: Db, app: Application, available: boolean) {
  if (app.status !== "accepted") return false;
  await db
    .from("applications")
    .update({ available_since: available ? (app.available_since ?? new Date().toISOString()) : null, last_nudge_at: null })
    .eq("id", app.id);
  return true;
}

// ---------------------------------------------------------------------------
// Die KI lernt aus dem Feedback
// ---------------------------------------------------------------------------

const LearningSchema = z.object({
  notizen: z.array(z.string()).describe("Höchstens acht konkrete Hinweise für künftige Tischrunden"),
});

/** Wöchentlich ab fünf neuen Rückmeldungen; force (Adminbereich) wertet sofort alles aus. */
export async function updateLearnings(db: Db, force = false) {
  const latest = (await db.from("learnings").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle()).data as
    | { created_at: string }
    | null;
  if (!force && latest && Date.now() - new Date(latest.created_at).getTime() < 7 * DAY) return false;

  let newer = db.from("feedback").select("seat_id", { count: "exact", head: true });
  if (latest && !force) newer = newer.gt("created_at", latest.created_at);
  const { count } = await newer;
  if ((count ?? 0) < (force ? 1 : 5)) return false;

  const rows = must(
    await db
      .from("feedback")
      .select("rating_evening, rating_table, improve, seats!inner(dinner_id, dinners!inner(matching))")
      .order("created_at", { ascending: false })
      .limit(60),
    "Feedback für Lernnotizen laden",
  ) as unknown as {
    rating_evening: number | null;
    rating_table: number | null;
    improve: string | null;
    seats: { dinner_id: string; dinners: { matching: { personen?: { achsen: number[]; typ: string }[] } | null } };
  }[];

  const byDinner = new Map<string, string[]>();
  for (const r of rows) {
    const id = r.seats.dinner_id;
    if (!byDinner.has(id)) {
      const mix = (r.seats.dinners.matching?.personen ?? []).map((p) => `${p.typ} [${p.achsen.join("/")}]`).join(", ");
      byDinner.set(id, [`Runde: ${mix || "unbekannt"}`]);
    }
    byDinner.get(id)!.push(`  Abend ${r.rating_evening ?? "–"}/5, Runde ${r.rating_table ?? "–"}/5${r.improve ? `, Hinweis: ${r.improve.slice(0, 200)}` : ""}`);
  }

  const result = await askStructured({
    schema: LearningSchema,
    system:
      "Du wertest Feedback zu Tisch6-Dinnern aus (sechs Singles pro Tisch). Leite daraus höchstens acht konkrete, umsetzbare Hinweise ab, wie künftige Tischrunden zusammengestellt werden sollten (Persönlichkeitsmix, Themen, Altersstruktur, Lebensstil). Nur was die Daten wirklich hergeben; Achsen-Werte: ruhig–extrovertiert / spontan–strukturiert / humorvoll–ernst / bodenständig–abenteuerlustig, je 1–5.",
    user: [...byDinner.values()].map((lines) => lines.join("\n")).join("\n\n"),
    effort: "medium",
    maxTokens: 3000,
  });
  must(
    await db.from("learnings").insert({ feedback_count: rows.length, notes: result.notizen.map((n) => `- ${n}`).join("\n") }),
    "Lernnotizen speichern",
  );
  return true;
}

