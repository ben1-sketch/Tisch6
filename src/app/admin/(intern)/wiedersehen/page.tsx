import type { Metadata } from "next";
import Link from "next/link";
import { Empty, Notice, PageTitle, PersonLink, Stat } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { day, when } from "@/lib/admin/format";
import { type Match, db } from "@/lib/db";

export const metadata: Metadata = { title: "Wiedersehen" };

type Row = Match & { dinners: { id: string; starts_at: string; restaurants: { name: string } | null } | null };

export default async function MatchesPage() {
  await requireAdmin();
  const client = db();
  const [{ data, error }, completed, wishes] = await Promise.all([
    client.from("matches").select("*, dinners(id, starts_at, restaurants(name))").order("created_at", { ascending: false }).limit(300),
    client.from("dinners").select("id", { count: "exact", head: true }).eq("status", "completed"),
    client.from("feedback").select("wants_to_see"),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const ids = [...new Set(rows.flatMap((m) => [m.a_id, m.b_id]))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: apps } = await client.from("applications").select("id, first_name").in("id", ids);
    for (const a of (apps ?? []) as { id: string; first_name: string }[]) names.set(a.id, a.first_name);
  }
  const feedback = (wishes.data ?? []) as { wants_to_see: string[] }[];
  const withWish = feedback.filter((f) => f.wants_to_see.length > 0).length;

  return (
    <>
      <PageTitle title="Wiedersehen" sub="Gegenseitige Wünsche nach dem Abend – nur dann bekommen beide die Kontaktdaten." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Matches" value={rows.length} />
        <Stat label="Abende vorbei" value={completed.count ?? 0} />
        <Stat label="Pro Abend" value={completed.count ? (rows.length / completed.count).toFixed(1).replace(".", ",") : "–"} />
        <Stat
          label="Wollen jemanden wiedersehen"
          value={feedback.length ? `${Math.round((withWish / feedback.length) * 100)} %` : "–"}
          hint={`${withWish} von ${feedback.length} Rückmeldungen`}
        />
      </div>
      {error && <Notice tone="red">Datenbank: {error.message}</Notice>}
      {rows.length === 0 ? (
        <Empty>Noch keine gegenseitigen Wiedersehen.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((m) => (
            <li key={m.id} className="glass flex flex-wrap items-center justify-between gap-2 rounded-2xl p-4 text-sm">
              <span>
                ♥ <PersonLink id={m.a_id} name={names.get(m.a_id)} /> und <PersonLink id={m.b_id} name={names.get(m.b_id)} />
              </span>
              <span className="text-mist">
                {m.dinners ? (
                  <Link href={`/admin/dinner/${m.dinners.id}`} className="hover:underline">
                    Dinner {day(m.dinners.starts_at)}
                    {m.dinners.restaurants ? `, ${m.dinners.restaurants.name}` : ""}
                  </Link>
                ) : (
                  "–"
                )}{" "}
                · {when(m.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
