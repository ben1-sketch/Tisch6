import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Chip, Empty, Notice, PageTitle, PersonLink, Stat } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { day, when } from "@/lib/admin/format";
import { TABLE } from "@/lib/config";
import { type Learning, type Match, db } from "@/lib/db";
import { learningsAction } from "../../actions";

export const metadata: Metadata = { title: "Wiedersehen & Feedback" };

type DinnerRow = {
  id: string;
  starts_at: string;
  restaurant_id: string;
  matching: { personen?: { achsen?: number[] }[] } | null;
  restaurants: { name: string } | null;
  seats: { id: string; status: string; application_id: string; applications: { alter: number | null; ziel: string | null } | null }[];
};
type FeedbackRow = {
  seat_id: string;
  created_at: string;
  rating_evening: number | null;
  rating_table: number | null;
  improve: string | null;
  quote: string | null;
  quote_ok: boolean;
  wants_to_see: string[];
  absent: string[];
  seats: { application_id: string; dinner_id: string };
};

type Stats = { tables: number; evening: number[]; table: number[]; matches: number };
const empty = (): Stats => ({ tables: 0, evening: [], table: [], matches: 0 });
const avg = (v: number[]) => (v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1).replace(".", ",") : "–");
const perTable = (s: Stats) => (s.tables ? (s.matches / s.tables).toFixed(1).replace(".", ",") : "–");

/** Kennzahlen je Gruppe (Lokal, Temperament der Runde, …) */
function StatsTable({ rows, label }: { rows: [string, Stats][]; label: string }) {
  if (!rows.length) return <Empty>Noch keine abgeschlossenen Tische.</Empty>;
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
      <table className="w-full min-w-[26rem] text-sm">
        <thead className="text-left text-xs text-mist">
          <tr>
            <th className="py-1.5 pr-3 font-normal">{label}</th>
            <th className="px-2 py-1.5 font-normal">Tische</th>
            <th className="px-2 py-1.5 font-normal">Ø Abend</th>
            <th className="px-2 py-1.5 font-normal">Ø Runde</th>
            <th className="py-1.5 pl-2 font-normal">Matches/Tisch</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(([name, s]) => (
            <tr key={name}>
              <td className="py-2 pr-3">{name}</td>
              <td className="px-2 py-2">{s.tables}</td>
              <td className="px-2 py-2">{avg(s.evening)}</td>
              <td className="px-2 py-2">{avg(s.table)}</td>
              <td className="py-2 pl-2">{perTable(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="mb-2 text-xs text-mist">{hint}</p>}
      {children}
    </div>
  );
}

export default async function ReunionPage() {
  await requireAdmin();
  const client = db();
  const [dinners, feedback, matches, learnings] = await Promise.all([
    client
      .from("dinners")
      .select("id, starts_at, restaurant_id, matching, restaurants(name), seats(id, status, application_id, applications(alter:profile->alter, ziel:profile->>beziehungsziel))")
      .eq("status", "completed")
      .order("starts_at", { ascending: false })
      .limit(200),
    client
      .from("feedback")
      .select("seat_id, created_at, rating_evening, rating_table, improve, quote, quote_ok, wants_to_see, absent, seats!inner(application_id, dinner_id)")
      .order("created_at", { ascending: false })
      .limit(1000),
    client.from("matches").select("*").order("created_at", { ascending: false }).limit(500),
    client.from("learnings").select("*").order("created_at", { ascending: false }).limit(3),
  ]);
  const tables = (dinners.data ?? []) as unknown as DinnerRow[];
  const fb = (feedback.data ?? []) as unknown as FeedbackRow[];
  const matchRows = (matches.data ?? []) as Match[];
  const notes = (learnings.data ?? []) as Learning[];

  // Kennzahlen je Tisch
  const byTable = tables.map((d) => {
    const guests = d.seats.filter((s) => s.status === "attended");
    const ages = guests.map((s) => s.applications?.alter).filter((a): a is number => typeof a === "number");
    const goals = guests.map((s) => s.applications?.ziel ?? null);
    const energy = (d.matching?.personen ?? []).map((p) => p.achsen?.[0]).filter((v): v is number => typeof v === "number");
    const rated = fb.filter((f) => f.seats.dinner_id === d.id);
    return {
      d,
      guests: guests.length,
      matches: matchRows.filter((m) => m.dinner_id === d.id).length,
      evening: rated.map((f) => f.rating_evening).filter((v): v is number => v !== null),
      table: rated.map((f) => f.rating_table).filter((v): v is number => v !== null),
      energy: energy.length ? energy.reduce((a, b) => a + b, 0) / energy.length : null,
      ageSpan: ages.length > 1 ? Math.max(...ages) - Math.min(...ages) : null,
      sameGoal: goals.length > 0 && goals.every((g) => g !== null && g === goals[0]),
    };
  });

  const group = (key: (t: (typeof byTable)[number]) => string | null) => {
    const map = new Map<string, Stats>();
    for (const t of byTable) {
      const k = key(t);
      if (!k) continue;
      const s = map.get(k) ?? empty();
      s.tables++;
      s.evening.push(...t.evening);
      s.table.push(...t.table);
      s.matches += t.matches;
      map.set(k, s);
    }
    return [...map].sort((a, b) => b[1].tables - a[1].tables);
  };

  const withWish = fb.filter((f) => f.wants_to_see.length > 0).length;
  const ids = [...new Set([...matchRows.flatMap((m) => [m.a_id, m.b_id]), ...fb.slice(0, 60).map((f) => f.seats.application_id)])];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data } = await client.from("applications").select("id, first_name").in("id", ids.slice(0, 300));
    for (const a of (data ?? []) as { id: string; first_name: string }[]) names.set(a.id, a.first_name);
  }
  const best = [...byTable].sort((a, b) => b.matches - a.matches || Number(avg(b.table).replace(",", ".")) - Number(avg(a.table).replace(",", "."))).slice(0, 12);

  return (
    <>
      <PageTitle title="Wiedersehen & Feedback" sub="Was nach den Abenden passiert – und welche Lokale und Konstellationen gut funktionieren." />
      {dinners.error && <Notice tone="red">Datenbank: {dinners.error.message}</Notice>}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Gegenseitige Matches" value={matchRows.length} />
        <Stat label="Tische vorbei" value={tables.length} hint={`${perTable({ ...empty(), tables: tables.length, matches: matchRows.length })} Matches pro Tisch`} />
        <Stat label="Wollen wiedersehen" value={fb.length ? `${Math.round((withWish / fb.length) * 100)} %` : "–"} hint={`${withWish} von ${fb.length}`} />
        <Stat label="Ø Wie war der Abend?" value={avg(fb.map((f) => f.rating_evening).filter((v): v is number => v !== null))} hint="von 5" />
        <Stat label="Ø Wie hat die Runde gepasst?" value={avg(fb.map((f) => f.rating_table).filter((v): v is number => v !== null))} hint="von 5" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Welche Lokale funktionieren">
          <StatsTable label="Lokal" rows={group((t) => t.d.restaurants?.name ?? "unbekannt")} />
        </Card>

        <Card title="Welche Konstellationen funktionieren">
          <div className="space-y-5">
            <Section title="Temperament der Runde" hint="Durchschnitt auf der Achse ruhig–extrovertiert">
              <StatsTable
                label="Runde"
                rows={group((t) => (t.energy === null ? null : t.energy < 2.5 ? "eher ruhig" : t.energy > 3.5 ? "eher gesellig" : "ausgeglichen"))}
              />
            </Section>
            <Section title="Beziehungsziel am Tisch">
              <StatsTable label="Ziel" rows={group((t) => (t.sameGoal ? "alle gleich" : "gemischt oder unbekannt"))} />
            </Section>
            <Section title="Altersspanne">
              <StatsTable label="Spanne" rows={group((t) => (t.ageSpan === null ? null : t.ageSpan <= 5 ? "bis 5 Jahre" : "6–10 Jahre"))} />
            </Section>
            <Section title="Vollzählig oder zu fünft">
              <StatsTable label="Gäste" rows={group((t) => (t.guests >= TABLE.size ? "sechs" : t.guests === TABLE.size - 1 ? "fünf" : null))} />
            </Section>
          </div>
        </Card>
      </div>

      <Card title="Matches pro Tisch" className="mt-4">
        {best.length === 0 ? (
          <Empty>Noch keine abgeschlossenen Tische.</Empty>
        ) : (
          <ul className="divide-y divide-white/5 text-sm">
            {best.map((t) => (
              <li key={t.d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/admin/tische/${t.d.id}`} className="hover:text-gold-200">
                  {when(t.d.starts_at)} · {t.d.restaurants?.name ?? "–"}
                </Link>
                <span className="text-mist">
                  ♥ {t.matches} · Abend {avg(t.evening)} · Runde {avg(t.table)} · {t.guests} Gäste
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Was die KI gelernt hat">
          {notes.length === 0 ? (
            <Empty>Noch keine Lernnotizen – sie entstehen ab fünf Rückmeldungen.</Empty>
          ) : (
            <div className="space-y-4">
              {notes.map((n, i) => (
                <div key={n.id} className={i > 0 ? "border-t border-white/5 pt-4 opacity-70" : ""}>
                  <p className="mb-1 text-xs text-mist">
                    {when(n.created_at)} · aus {n.feedback_count} Rückmeldungen{i === 0 ? " · gilt gerade" : ""}
                  </p>
                  <p className="whitespace-pre-line text-sm text-cloud">{n.notes}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-mist">
            Zusätzlich merkt sich Tisch6 für jede Person, welche Typen sie wiedersehen wollte und wer sie wiedersehen wollte – das fließt jede Nacht in die
            Tischplanung ein.
          </p>
          <ActionForm action={learningsAction} submit="Jetzt neu auswerten" className="mt-4" />
        </Card>

        <Card title="Alle Matches">
          {matchRows.length === 0 ? (
            <Empty>Noch keine gegenseitigen Wiedersehen.</Empty>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {matchRows.slice(0, 50).map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2">
                  <span>
                    ♥ <PersonLink id={m.a_id} name={names.get(m.a_id)} /> und <PersonLink id={m.b_id} name={names.get(m.b_id)} />
                  </span>
                  <Link href={`/admin/tische/${m.dinner_id}`} className="text-mist hover:underline">
                    {day(m.created_at)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Neuestes Feedback" className="mt-4">
        {fb.length === 0 ? (
          <Empty>Noch kein Feedback.</Empty>
        ) : (
          <ul className="space-y-3 text-sm">
            {fb.slice(0, 40).map((f) => (
              <li key={f.seat_id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <PersonLink id={f.seats.application_id} name={names.get(f.seats.application_id)} />
                    <Link href={`/admin/tische/${f.seats.dinner_id}`} className="ml-2 text-mist hover:underline">
                      Tisch
                    </Link>
                  </span>
                  <span className="text-mist">
                    Abend {f.rating_evening ?? "–"}/5 · Runde {f.rating_table ?? "–"}/5 · ♥ {f.wants_to_see.length}
                    {f.absent.length > 0 && ` · meldet ${f.absent.length} abwesend`}
                  </span>
                </div>
                {f.improve && <p className="mt-1 text-cloud">„{f.improve}“</p>}
                {f.quote && (
                  <p className="mt-1 text-cloud">
                    In einem Satz: „{f.quote}“ {f.quote_ok ? <Chip tone="green">darf zitiert werden</Chip> : <Chip>nur intern</Chip>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Zitate für Instagram und die Website" className="mt-4">
        <p className="mb-3 text-sm text-mist">Nur Sätze, die die Gäste ausdrücklich freigegeben haben – immer ohne Namen verwenden.</p>
        {fb.some((f) => f.quote && f.quote_ok) ? (
          <ul className="space-y-2 text-sm">
            {fb
              .filter((f) => f.quote && f.quote_ok)
              .map((f) => (
                <li key={f.seat_id} className="text-cloud">
                  „{f.quote}“ <span className="text-mist">· {day(f.created_at)}</span>
                </li>
              ))}
          </ul>
        ) : (
          <Empty>Noch keine freigegebenen Zitate.</Empty>
        )}
      </Card>
    </>
  );
}
