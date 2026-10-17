import "server-only";
import { z } from "zod";
import { askStructured } from "./claude";
import { NO_SHOW_LIMIT, NO_SHOW_VOTES, PRICES, TABLE, TIMING } from "./config";
import { type Application, type Db, type Dinner, type Feedback, type Seat, OPEN_SEAT, must } from "./db";
import {
  adminMail,
  feedbackRequestMail,
  fivePersonMail,
  followUpMail,
  lebenszeichenMail,
  matchMail,
  noShowMail,
  referralRewardMail,
  reminder1dMail,
  reminder1dSms,
  reminder2hMail,
  reminder2hSms,
  reminder3dMail,
} from "./messages";
import { notifyAdmin, sendEmail, sendSms } from "./notify";
import { dinnerInfo, loadApplication, loadDinner } from "./seats";
import { DAY, HOUR, dateKey, viennaDate } from "./time";

async function seatsOf(db: Db, dinnerId: string) {
  return must(await db.from("seats").select("*").eq("dinner_id", dinnerId), "Plätze laden") as Seat[];
}

async function applicationsByIds(db: Db, ids: string[]) {
  if (!ids.length) return [] as Application[];
  return must(await db.from("applications").select("*").in("id", ids), "Gäste laden") as Application[];
}

// ---------------------------------------------------------------------------
// Eisbrecher-Karte: zwei eigene Gesprächsfragen pro Person
// ---------------------------------------------------------------------------

const IcebreakerSchema = z.object({
  karten: z.array(z.object({ person: z.string(), fragen: z.array(z.string()) })),
});

const ICEBREAKER_SYSTEM = `Du schreibst Eisbrecher-Karten für ein Tisch6-Dinner: sechs Singles an einem Tisch in Wien.
Jede Person bekommt zwei eigene, leichte Gesprächsfragen, die sie am Abend in die Runde stellen kann.
Die Fragen sollen neugierig machen, verbinden und zum Erzählen einladen – nicht zu intim, nichts über Ex-Partner, Geld, Politik oder Religion.
Nutze die Themen der Runde als Inspiration, verrate aber nichts Persönliches über andere Gäste. Höchstens 15 Wörter pro Frage, alle Fragen verschieden, Du-Form.
Antworte im vorgegebenen JSON-Format.`;

const FALLBACK_QUESTIONS = [
  "Was war das schönste Kompliment, das du je bekommen hast?",
  "Welcher Ort in Wien ist dein heimlicher Lieblingsplatz?",
  "Was würdest du tun, wenn du ein Jahr frei hättest?",
  "Welches Essen erinnert dich an deine Kindheit?",
  "Worüber hast du zuletzt deine Meinung geändert?",
  "Welche kleine Gewohnheit macht dich glücklich?",
  "Was ist das Mutigste, das du je gemacht hast?",
  "Welches Buch, welcher Film oder Podcast hat dich zuletzt gepackt?",
  "Wo warst du das letzte Mal so richtig überrascht?",
  "Welche Fähigkeit würdest du gern über Nacht beherrschen?",
  "Was steht ganz oben auf deiner Wien-Bucketlist?",
  "Wofür kannst du dich ehrlich begeistern?",
];

export async function ensureIcebreakers(db: Db, dinner: Dinner) {
  const seats = (await seatsOf(db, dinner.id)).filter((s) => s.status === "confirmed");
  if (!seats.length || seats.every((s) => s.icebreaker)) return;
  const apps = new Map((await applicationsByIds(db, seats.map((s) => s.application_id))).map((a) => [a.id, a]));
  const labels = seats.map((_, i) => `G${i + 1}`);

  let cards: string[][] | null = null;
  try {
    const user = seats
      .map((s, i) => {
        const p = apps.get(s.application_id)?.profile;
        return `${labels[i]} (${p?.geschlecht ?? "?"}, ${p?.alter ?? "?"}): Themen ${p?.gespraechsthemen?.join(", ") || "–"}; Typ ${p?.persoenlichkeit.typ ?? "–"}`;
      })
      .join("\n");
    const result = await askStructured({ schema: IcebreakerSchema, system: ICEBREAKER_SYSTEM, user, effort: "low", maxTokens: 3000 });
    cards = labels.map((label) => result.karten.find((k) => k.person === label)?.fragen.slice(0, 2) ?? []);
    if (cards.some((c) => c.length < 2)) cards = null;
  } catch (e) {
    console.error("Eisbrecher-Karten über KI fehlgeschlagen – nehme Standardfragen", e);
  }
  cards ??= seats.map((_, i) => [FALLBACK_QUESTIONS[(i * 2) % 12], FALLBACK_QUESTIONS[(i * 2 + 1) % 12]]);

  for (const [i, seat] of seats.entries()) {
    if (!seat.icebreaker) await db.from("seats").update({ icebreaker: { fragen: cards[i] } }).eq("id", seat.id);
  }
}

// ---------------------------------------------------------------------------
// Erinnerungen: drei Tage, einen Tag und zwei Stunden vorher – mit Adresse
// ---------------------------------------------------------------------------

export async function sendReminders(db: Db, deadline: number) {
  const now = Date.now();
  const dinners = must(
    await db
      .from("dinners")
      .select("*")
      .eq("status", "confirmed")
      .gt("starts_at", new Date(now).toISOString())
      .lte("starts_at", new Date(now + TIMING.decisionHoursBefore * HOUR).toISOString()),
    "Anstehende Dinner laden",
  ) as Dinner[];
  let sent = 0;
  for (const dinner of dinners) {
    if (Date.now() > deadline) break;
    const start = new Date(dinner.starts_at).getTime();
    const { restaurant } = await loadDinner(db, dinner.id);
    const info = dinnerInfo(dinner, restaurant);
    const left = start - now;
    if (left <= 24 * HOUR) await ensureIcebreakers(db, dinner);
    const seats = (await seatsOf(db, dinner.id)).filter((s) => s.status === "confirmed");

    for (const seat of seats) {
      const app = await loadApplication(db, seat.application_id);
      const base = { applicationId: app.id };
      if (left <= 2 * HOUR) {
        await sendSms(db, { ...base, to: app.phone, body: reminder2hSms({ dinner: info }), kind: "reminder_2h", dedupeKey: `r2h_sms:${seat.id}` });
        await sendEmail(db, { ...base, to: app.email, content: reminder2hMail({ name: app.first_name, dinner: info, token: seat.token }), kind: "reminder_2h", dedupeKey: `r2h:${seat.id}` });
      } else if (left <= 24 * HOUR) {
        const icebreaker = seat.icebreaker?.fragen ?? [];
        await sendEmail(db, {
          ...base,
          to: app.email,
          content: reminder1dMail({ name: app.first_name, dinner: info, token: seat.token, icebreaker }),
          kind: "reminder_1d",
          dedupeKey: `r1d:${seat.id}`,
        });
        await sendSms(db, { ...base, to: app.phone, body: reminder1dSms({ dinner: info, token: seat.token }), kind: "reminder_1d", dedupeKey: `r1d_sms:${seat.id}` });
      } else {
        await sendEmail(db, {
          ...base,
          to: app.email,
          content: reminder3dMail({ name: app.first_name, dinner: info, token: seat.token }),
          kind: "reminder_3d",
          dedupeKey: `r3d:${seat.id}`,
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
      updated_at: new Date().toISOString(),
    }),
    "Feedback speichern",
  );

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

