import "server-only";
import { TIMING } from "./config";
import { type Application, type Db, OPEN_SEAT, must } from "./db";
import { type History, type Person, toPerson } from "./matching-core";
import { DAY } from "./time";

/**
 * Alle, die gerade an einen Tisch eingeladen werden können: angenommen, verfügbar, nicht in Prüfung,
 * ohne offene Einladung – und nach zwei nicht gebuchten Einladungen höchstens einmal im Monat.
 */
export async function loadPool(db: Db): Promise<Person[]> {
  const apps = must(
    await db
      .from("applications")
      .select("*")
      .eq("status", "accepted")
      .eq("under_review", false)
      .not("available_since", "is", null)
      .not("profile", "is", null),
    "Pool laden",
  ) as Application[];
  if (!apps.length) return [];

  const busy = must(
    await db.from("seats").select("application_id").in("status", OPEN_SEAT),
    "Offene Plätze laden",
  ) as { application_id: string }[];
  const seated = new Set(busy.map((s) => s.application_id));
  const monthAgo = Date.now() - TIMING.monthlyDays * DAY;

  const eligible = apps.filter(
    (a) =>
      !seated.has(a.id) &&
      !(a.missed_bookings >= 2 && a.last_invited_at && new Date(a.last_invited_at).getTime() > monthAgo),
  );

  // Was die Person nach früheren Abenden gesagt hat – die KI lernt daraus für den nächsten Tisch
  const notes = new Map<string, string[]>();
  const rows = must(
    await db
      .from("feedback")
      .select("improve, rating_table, seats!inner(application_id)")
      .not("improve", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
    "Feedback laden",
  ) as unknown as { improve: string; rating_table: number | null; seats: { application_id: string } }[];
  for (const row of rows) {
    const list = notes.get(row.seats.application_id) ?? [];
    if (list.length < 3) list.push(`${row.improve.slice(0, 200)}${row.rating_table ? ` (Runde bewertet mit ${row.rating_table}/5)` : ""}`);
    notes.set(row.seats.application_id, list);
  }

  const history = await loadHistory(db);
  const lastRestaurant = await lastRestaurants(db, eligible.map((a) => a.id));
  return eligible
    .map((a) =>
      toPerson(a, {
        notes: notes.get(a.id) ?? [],
        history: history.get(a.id) ?? { liked: [], likedBy: [] },
        lastRestaurantId: lastRestaurant.get(a.id) ?? null,
      }),
    )
    .filter((p): p is Person => p !== null);
}

type AffinityRow = {
  from_id: string | null;
  to_id: string | null;
  from_typ: string | null;
  from_achsen: number[] | null;
  to_typ: string | null;
  to_achsen: number[] | null;
};

/** Wiedersehen-Historie je Person: welche Typen sie wiedersehen wollte und welche Typen sie wiedersehen wollten */
export async function loadHistory(db: Db) {
  const history = new Map<string, History>();
  const { data, error } = await db
    .from("affinities")
    .select("from_id, to_id, from_typ, from_achsen, to_typ, to_achsen")
    .order("created_at", { ascending: false })
    .limit(3000);
  if (error) {
    // z. B. 0006 noch nicht ausgeführt – dann eben ohne Historie
    console.error("Wiedersehen-Historie laden", error.message);
    return history;
  }
  const rows = (data ?? []) as AffinityRow[];
  const of = (id: string) => {
    if (!history.has(id)) history.set(id, { liked: [], likedBy: [] });
    return history.get(id)!;
  };
  for (const r of rows) {
    if (r.from_id && of(r.from_id).liked.length < 12) of(r.from_id).liked.push({ typ: r.to_typ, axes: r.to_achsen });
    if (r.to_id && of(r.to_id).likedBy.length < 12) of(r.to_id).likedBy.push({ typ: r.from_typ, axes: r.from_achsen });
  }
  return history;
}

/** Lokal des jeweils letzten Abends (bestätigt, dabei gewesen oder nicht erschienen) */
async function lastRestaurants(db: Db, ids: string[]) {
  const last = new Map<string, { restaurant: string; at: number }>();
  const rows: { application_id: string; dinners: { restaurant_id: string; starts_at: string } }[] = [];
  // in Paketen abfragen, damit die Adresse der Abfrage nicht zu lang wird
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = must(
      await db
        .from("seats")
        .select("application_id, dinners!inner(restaurant_id, starts_at)")
        .in("status", ["confirmed", "attended", "no_show"])
        .in("application_id", ids.slice(i, i + 100)),
      "Letzte Lokale laden",
    ) as unknown as typeof rows;
    rows.push(...chunk);
  }
  for (const r of rows) {
    const at = new Date(r.dinners.starts_at).getTime();
    const prev = last.get(r.application_id);
    if (!prev || at > prev.at) last.set(r.application_id, { restaurant: r.dinners.restaurant_id, at });
  }
  return new Map([...last].map(([id, v]) => [id, v.restaurant]));
}
