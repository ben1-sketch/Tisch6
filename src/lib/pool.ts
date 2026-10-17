import "server-only";
import { TIMING } from "./config";
import { type Application, type Db, OPEN_SEAT, must } from "./db";
import { toPerson, type Person } from "./matching-core";
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

  return eligible.map((a) => toPerson(a, notes.get(a.id) ?? [])).filter((p): p is Person => p !== null);
}
