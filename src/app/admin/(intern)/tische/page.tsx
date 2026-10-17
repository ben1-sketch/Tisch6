import type { Metadata } from "next";
import Link from "next/link";
import { Chip, Empty, Notice, PageTitle, Tabs } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { DINNER_STATUS, relative, when } from "@/lib/admin/format";
import { TABLE } from "@/lib/config";
import { type DinnerStatus, type SeatStatus, db } from "@/lib/db";
import { HOUR } from "@/lib/time";

export const metadata: Metadata = { title: "Tische" };

const FILTERS = [
  { key: "kommend", label: "Kommend" },
  { key: "vorbei", label: "Vorbei" },
  { key: "abgesagt", label: "Abgesagt" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

type Row = {
  id: string;
  starts_at: string;
  status: DinnerStatus;
  moved_at: string | null;
  restaurants: { name: string; district: string | null } | null;
  seats: { status: SeatStatus; application_id: string; applications: { first_name: string; gender: string | null } | null }[];
};

const SHOWN: SeatStatus[] = ["confirmed", "invited", "offered", "attended", "no_show"];

function loadTables(filter: Filter) {
  // „vorbei“ ab 12 Stunden nach Beginn – danach verschickt der Durchlauf die Feedback-Anfragen
  const since = new Date(Date.now() - 12 * HOUR).toISOString();
  let q = db()
    .from("dinners")
    .select("id, starts_at, status, moved_at, restaurants(name, district), seats(status, application_id, applications(first_name, gender:profile->>geschlecht))");
  if (filter === "kommend") q = q.in("status", ["inviting", "confirmed"]).gte("starts_at", since).order("starts_at");
  if (filter === "vorbei") q = q.or(`status.eq.completed,and(status.eq.confirmed,starts_at.lt.${since})`).order("starts_at", { ascending: false });
  if (filter === "abgesagt") q = q.in("status", ["postponed", "cancelled"]).order("starts_at", { ascending: false });
  return q.limit(100);
}

/** Teilnehmer als Punkte: grün = bezahlt bzw. dabei gewesen, rot = unbezahlt bzw. nicht erschienen */
function Guest({ name, status }: { name: string; status: SeatStatus }) {
  const paid = status === "confirmed" || status === "attended";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${
        paid ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-red-400/40 bg-red-500/10 text-red-200"
      }`}
      title={paid ? "bezahlt" : status === "no_show" ? "nicht erschienen" : "unbezahlt"}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${paid ? "bg-emerald-300" : "bg-red-400"}`} />
      {name}
    </span>
  );
}

export default async function TablesPage({ searchParams }: PageProps<"/admin/tische">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as Filter) : "kommend";
  const { data, error } = await loadTables(filter);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle title="Tische" sub="Die KI plant die Tische jede Nacht. Grün = bezahlt, rot = unbezahlt." />
      <Tabs active={filter} items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: `/admin/tische?filter=${f.key}` }))} />
      {error && <Notice tone="red">Datenbank: {error.message}</Notice>}
      {rows.length === 0 ? (
        <Empty>{filter === "kommend" ? "Gerade ist kein Tisch geplant." : "Nichts hier."}</Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((d) => {
            const seats = d.seats.filter((s) => SHOWN.includes(s.status)).sort((a, b) => SHOWN.indexOf(a.status) - SHOWN.indexOf(b.status));
            const fixed = d.seats.filter((s) => s.status === "confirmed" || s.status === "attended");
            const women = fixed.filter((s) => s.applications?.gender === "frau").length;
            const men = fixed.filter((s) => s.applications?.gender === "mann").length;
            return (
              <li key={d.id}>
                <Link href={`/admin/tische/${d.id}`} className="glass block rounded-2xl p-4 transition hover:border-rose-400/40">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{when(d.starts_at)}</div>
                      <div className="text-sm text-mist">
                        {d.restaurants?.name ?? "–"}
                        {d.restaurants?.district ? ` · ${d.restaurants.district}` : ""}
                        {filter === "kommend" && ` · ${relative(d.starts_at)}`}
                      </div>
                    </div>
                    <span className="flex flex-wrap gap-1.5">
                      {d.moved_at && <Chip tone="amber">verschoben</Chip>}
                      <Chip tone={DINNER_STATUS[d.status].tone}>{DINNER_STATUS[d.status].label}</Chip>
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {seats.map((s) => (
                      <Guest key={s.application_id} name={s.applications?.first_name ?? "gelöscht"} status={s.status} />
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-mist">
                    {fixed.length}/{TABLE.size} bezahlt · {women} Frauen · {men} Männer
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
