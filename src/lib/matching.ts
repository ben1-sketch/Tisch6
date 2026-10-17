import "server-only";
import { z } from "zod";
import { askStructured } from "./claude";
import { TIMING } from "./config";
import { type Db, type Dinner, type Restaurant, type Seat, must } from "./db";
import { AXES, type Person, type Slot, candidateTables, pickSlot } from "./matching-core";
import { adminMail } from "./messages";
import { notifyAdmin } from "./notify";
import { loadPool } from "./pool";
import { loadApplication, sendInvitation } from "./seats";
import { HOUR, dateKey, viennaDate } from "./time";

/** Höchstens so viele neue Tische pro Durchlauf (jede Wahl ist ein KI-Aufruf) */
const MAX_TABLES_PER_RUN = 3;

const ChoiceSchema = z.object({
  runde: z.number().int().describe("Nummer der gewählten Runde"),
  begruendung: z.string().describe("Zwei bis drei Sätze, warum diese Runde – nur intern"),
});

const CHOICE_SYSTEM = `Du bist die Tischplanerin von Tisch6: KI-kuratierte Dating-Dinner in Wien, sechs Singles pro Tisch.
Du bekommst mehrere mögliche Runden. Alle erfüllen bereits die festen Regeln (drei Frauen, drei Männer, höchstens zehn Jahre Altersspanne, gewünschte Altersspannen, gemeinsamer Wochentag).
Wähle die Runde, in der die Gespräche am besten fließen und sich die Menschen ergänzen:
- Die vier Persönlichkeitsachsen sollen gemischt sein – nicht alle gleich, aber auch keine Runde, in der niemand das Gespräch trägt.
- Gemeinsame oder sich ergänzende Gesprächsthemen helfen.
- Zwischen Frauen und Männern sollen Lebensentwürfe nicht offensichtlich kollidieren (z. B. Kinderwunsch).
- Berücksichtige Hinweise aus früherem Feedback und die Lernnotizen.
Antworte im vorgegebenen JSON-Format.`;

function describe(p: Person, label: string) {
  const axes = AXES.map((name, i) => `${name} ${p.axes[i]}/5`).join(", ");
  return [
    `${label} (${p.gender === "frau" ? "Frau" : "Mann"}, ${p.age})`,
    `  Achsen: ${axes}; Typ: ${p.typ}`,
    `  Kurzprofil: ${p.summary}`,
    `  Themen: ${p.topics.join(", ") || "–"}; Rauchen: ${p.smoker ?? "–"}; Kinderwunsch: ${p.childWish ?? "–"}`,
    ...(p.notes.length ? [`  Feedback nach früheren Abenden: ${p.notes.join(" | ")}`] : []),
  ].join("\n");
}

/** Die KI wählt unter gültigen Runden; ohne Antwort gilt die Runde mit der besten Bewertung. */
async function chooseRound(rounds: Person[][], learnings: string | null) {
  if (rounds.length === 1) return { index: 0, reason: "Einzige Runde, die alle Regeln erfüllt." };
  const labels = new Map<string, string>();
  const people: Person[] = [];
  for (const round of rounds) {
    for (const p of round) {
      if (labels.has(p.id)) continue;
      labels.set(p.id, `P${labels.size + 1}`);
      people.push(p);
    }
  }
  const user = [
    "Personen (anonymisiert):",
    ...people.map((p) => describe(p, labels.get(p.id)!)),
    "",
    "Mögliche Runden:",
    ...rounds.map((round, i) => `${i + 1}: ${round.map((p) => labels.get(p.id)).join(", ")}`),
    ...(learnings ? ["", "Lernnotizen aus bisherigem Feedback:", learnings] : []),
  ].join("\n");
  try {
    const choice = await askStructured({ schema: ChoiceSchema, system: CHOICE_SYSTEM, user, effort: "medium", maxTokens: 4000 });
    if (choice.runde >= 1 && choice.runde <= rounds.length) return { index: choice.runde - 1, reason: choice.begruendung };
  } catch (e) {
    console.error("KI-Tischwahl fehlgeschlagen – nehme die bestbewertete Runde", e);
  }
  return { index: 0, reason: "Bestbewertete Runde nach Persönlichkeitsmix, Wartezeit und Altersspannen." };
}

/** Bereits belegte Tische je „lokalId|YYYY-MM-DD“ */
async function busyMap(db: Db) {
  const dinners = must(
    await db
      .from("dinners")
      .select("restaurant_id, starts_at")
      .in("status", ["inviting", "confirmed"])
      .gte("starts_at", new Date().toISOString()),
    "Belegte Tische laden",
  ) as Pick<Dinner, "restaurant_id" | "starts_at">[];
  const busy = new Map<string, number>();
  for (const d of dinners) {
    const key = `${d.restaurant_id}|${dateKey(viennaDate(new Date(d.starts_at)))}`;
    busy.set(key, (busy.get(key) ?? 0) + 1);
  }
  return busy;
}

/** Legt das Dinner an und verschickt die Einladungen (48 Stunden Zeit, spätestens bis zur Entscheidung). */
async function createDinner(db: Db, people: Person[], slot: Slot, reason: string) {
  const dinner = must(
    await db
      .from("dinners")
      .insert({
        restaurant_id: slot.restaurant.id,
        starts_at: slot.startsAt.toISOString(),
        matching: { begruendung: reason, personen: people.map((p) => ({ id: p.id, achsen: p.axes, typ: p.typ })) },
      })
      .select("*")
      .single(),
    "Dinner anlegen",
  ) as Dinner;

  const expires = new Date(
    Math.min(Date.now() + TIMING.inviteHours * HOUR, slot.startsAt.getTime() - (TIMING.decisionHoursBefore + 1) * HOUR),
  ).toISOString();
  const seats = must(
    await db
      .from("seats")
      .insert(people.map((p) => ({ dinner_id: dinner.id, application_id: p.id, status: "invited", expires_at: expires })))
      .select("*"),
    "Plätze anlegen",
  ) as Seat[];
  await db.from("applications").update({ last_invited_at: new Date().toISOString() }).in("id", people.map((p) => p.id));

  for (const seat of seats) {
    const app = await loadApplication(db, seat.application_id);
    await sendInvitation(db, { seat, app, dinner, restaurant: slot.restaurant, table: people });
  }
  return dinner;
}

/**
 * Stellt Tische zusammen, sobald sechs passende Menschen da sind – sonst wird gewartet
 * („lieber verschieben als ein schlechter Tisch“).
 */
export async function matchTables(db: Db, deadline: number) {
  const restaurants = must(await db.from("restaurants").select("*").eq("active", true), "Lokale laden") as Restaurant[];
  const pool = await loadPool(db);
  if (pool.length < 6) return { created: 0, pool: pool.length };
  if (!restaurants.length) {
    await notifyAdmin(
      db,
      adminMail("Kein Stammlokal eingetragen", [
        `${pool.length} Personen warten auf einen Tisch, aber es ist noch kein aktives Lokal eingetragen.`,
        "Bitte im Adminbereich unter „Lokale“ ein Lokal anlegen: /admin/lokale",
      ]),
      "admin_no_restaurant",
      `no_restaurant:${dateKey(viennaDate(new Date()))}`,
    );
    return { created: 0, pool: pool.length };
  }

  const busy = await busyMap(db);
  const learnings =
    ((await db.from("learnings").select("notes").order("created_at", { ascending: false }).limit(1).maybeSingle()).data as { notes: string } | null)
      ?.notes ?? null;
  const now = Date.now();
  const used = new Set<string>();
  let created = 0;

  const book = async (people: Person[], slot: Slot, reason: string) => {
    await createDinner(db, people, slot, reason);
    const key = `${slot.restaurant.id}|${slot.dateKey}`;
    busy.set(key, (busy.get(key) ?? 0) + 1);
    for (const p of people) used.add(p.id);
    created++;
  };

  const roundsFor = (anchor: Person, options: { onlyDate?: string; preferRestaurantId?: string } = {}) =>
    candidateTables(
      anchor,
      pool.filter((p) => !used.has(p.id)),
      now,
    )
      .map((people) => ({ people, slot: pickSlot(people, restaurants, busy, new Date(now), options) }))
      .filter((r): r is { people: Person[]; slot: Slot } => r.slot !== null);

  // Wer am längsten wartet, kommt zuerst an die Reihe
  for (const anchor of [...pool].sort((a, b) => a.waitingSince - b.waitingSince)) {
    if (created >= MAX_TABLES_PER_RUN || Date.now() > deadline) break;
    if (used.has(anchor.id)) continue;
    const rounds = roundsFor(anchor);
    if (!rounds.length) continue;
    const choice = await chooseRound(rounds.map((r) => r.people), learnings);
    const { people, slot } = rounds[choice.index];
    await book(people, slot, choice.reason);

    // „Bring eine Freundin mit“: Begleitung möglichst am selben Abend, im selben Lokal, an einem anderen Tisch
    for (const p of people) {
      if (!p.buddyId || used.has(p.buddyId) || created >= MAX_TABLES_PER_RUN) continue;
      const buddy = pool.find((b) => b.id === p.buddyId);
      if (!buddy) continue;
      const buddyRounds = roundsFor(buddy, { onlyDate: slot.dateKey, preferRestaurantId: slot.restaurant.id });
      if (!buddyRounds.length) continue;
      const buddyChoice = await chooseRound(buddyRounds.map((r) => r.people), learnings);
      const picked = buddyRounds[buddyChoice.index];
      await book(picked.people, picked.slot, `${buddyChoice.reason} (Begleitung am selben Abend)`);
    }
  }
  return { created, pool: pool.length };
}
