import type { Metadata } from "next";
import Link from "next/link";
import { Chip, Empty, Notice, PageTitle, Tabs } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { DINNER_STATUS, relative, when } from "@/lib/admin/format";
import { TABLE } from "@/lib/config";
import { type DinnerStatus, db } from "@/lib/db";
import { HOUR } from "@/lib/time";

export const metadata: Metadata = { title: "Dinner" };

const FILTERS = [
  { key: "kommend", label: "Kommend" },
  { key: "vorbei", label: "Vorbei" },
  { key: "abgesagt", label: "Verschoben & abgesagt" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

type Row = {
  id: string;
  created_at: string;
  starts_at: string;
  status: DinnerStatus;
  restaurants: { name: string; district: string | null } | null;
  seats: { status: string; applications: { gender: string | null } | null }[];
};

function loadDinners(filter: Filter) {
  // „vorbei“ ab 12 Stunden nach Beginn – danach verschickt der Durchlauf die Feedback-Anfragen
  const since = new Date(Date.now() - 12 * HOUR).toISOString();
  let q = db().from("dinners").select("id, created_at, starts_at, status, restaurants(name, district), seats(status, applications(gender:profile->>geschlecht))");
  if (filter === "kommend") q = q.in("status", ["inviting", "confirmed"]).gte("starts_at", since).order("starts_at");
  if (filter === "vorbei") q = q.or(`status.eq.completed,and(status.eq.confirmed,starts_at.lt.${since})`).order("starts_at", { ascending: false });
  if (filter === "abgesagt") q = q.in("status", ["postponed", "cancelled"]).order("starts_at", { ascending: false });
  return q.limit(100);
}

export default async function DinnersPage({ searchParams }: PageProps<"/admin/dinner">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as Filter) : "kommend";
  const { data, error } = await loadDinners(filter);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle title="Dinner" sub="Die KI plant die Tische selbst – hier siehst du jede Runde und kannst eingreifen." />
      <Tabs active={filter} items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: `/admin/dinner?filter=${f.key}` }))} />
      {error && <Notice tone="red">Datenbank: {error.message}</Notice>}
      {rows.length === 0 ? (
        <Empty>{filter === "kommend" ? "Gerade ist kein Dinner geplant." : "Nichts hier."}</Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((d) => {
            const fixed = d.seats.filter((s) => s.status === "confirmed" || s.status === "attended");
            const open = d.seats.filter((s) => s.status === "invited" || s.status === "offered");
            const women = fixed.filter((s) => s.applications?.gender === "frau").length;
            const men = fixed.filter((s) => s.applications?.gender === "mann").length;
            return (
              <li key={d.id}>
                <Link href={`/admin/dinner/${d.id}`} className="glass block rounded-2xl p-4 transition hover:border-rose-400/40">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{when(d.starts_at)}</div>
                      <div className="text-sm text-mist">
                        {d.restaurants?.name ?? "–"}
                        {d.restaurants?.district ? ` · ${d.restaurants.district}` : ""}
                      </div>
                    </div>
                    <Chip tone={DINNER_STATUS[d.status].tone}>{DINNER_STATUS[d.status].label}</Chip>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className={fixed.length >= TABLE.size ? "text-emerald-300" : ""}>
                      {fixed.length}/{TABLE.size} {d.status === "completed" ? "Gäste" : "fix"}
                    </span>
                    <span className="text-mist">
                      {women} Frauen · {men} Männer
                    </span>
                    {open.length > 0 && <span className="text-sky-200">{open.length} Einladungen offen</span>}
                    {filter === "kommend" && <span className="text-mist">{relative(d.starts_at)}</span>}
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
