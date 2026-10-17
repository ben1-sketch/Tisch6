import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Chip, Empty, Notice, PageTitle, PersonLink, Tabs, field } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { APP_STATUS, day, when } from "@/lib/admin/format";
import { type Application, type Report, db } from "@/lib/db";
import { reportAction } from "../../actions";

export const metadata: Metadata = { title: "Meldungen" };

type Row = Report & { dinners: { id: string; starts_at: string; restaurants: { name: string } | null } | null };

export default async function ReportsPage({ searchParams }: PageProps<"/admin/meldungen">) {
  await requireAdmin();
  const sp = await searchParams;
  const done = sp.filter === "erledigt";
  const client = db();

  let q = client.from("reports").select("*, dinners(id, starts_at, restaurants(name))");
  q = done ? q.neq("status", "open") : q.eq("status", "open");
  const [{ data, error }, openCount] = await Promise.all([
    q.order("created_at", { ascending: false }).limit(100),
    client.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const rows = (data ?? []) as unknown as Row[];

  const ids = [...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id]).filter((x): x is string => Boolean(x)))];
  const people = new Map<string, Pick<Application, "id" | "first_name" | "status" | "under_review">>();
  if (ids.length) {
    const { data: apps } = await client.from("applications").select("id, first_name, status, under_review").in("id", ids);
    for (const a of (apps ?? []) as Pick<Application, "id" | "first_name" | "status" | "under_review">[]) people.set(a.id, a);
  }

  return (
    <>
      <PageTitle
        title="Meldungen"
        sub="Vom diskreten Meldeknopf. Gemeldete Profile werden bis zur Entscheidung nicht mehr eingeladen – und erfahren nie, wer gemeldet hat."
      />
      <Tabs
        active={done ? "erledigt" : "offen"}
        items={[
          { key: "offen", label: "Offen", href: "/admin/meldungen", count: openCount.count ?? 0 },
          { key: "erledigt", label: "Erledigt", href: "/admin/meldungen?filter=erledigt" },
        ]}
      />
      {error && <Notice tone="red">Datenbank: {error.message}</Notice>}
      {rows.length === 0 ? (
        <Empty>{done ? "Noch keine erledigten Meldungen." : "Keine offenen Meldungen. 🎉"}</Empty>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const reported = r.reported_id ? people.get(r.reported_id) : undefined;
            const reporter = r.reporter_id ? people.get(r.reporter_id) : undefined;
            return (
              <Card
                key={r.id}
                title={
                  <span>
                    Gemeldet: <PersonLink id={r.reported_id} name={reported?.first_name} />
                  </span>
                }
                aside={
                  <span className="flex flex-wrap gap-2">
                    {reported && <Chip tone={APP_STATUS[reported.status].tone}>{APP_STATUS[reported.status].label}</Chip>}
                    {reported?.under_review && reported.status !== "blocked" && <Chip tone="amber">pausiert bis zur Prüfung</Chip>}
                  </span>
                }
              >
                <p className="text-sm text-mist">
                  von <PersonLink id={r.reporter_id} name={reporter?.first_name} /> · {when(r.created_at)}
                  {r.dinners && (
                    <>
                      {" · "}
                      <Link href={`/admin/dinner/${r.dinners.id}`} className="text-rose-300 hover:underline">
                        Dinner {day(r.dinners.starts_at)}
                        {r.dinners.restaurants ? `, ${r.dinners.restaurants.name}` : ""}
                      </Link>
                    </>
                  )}
                </p>
                <blockquote className="mt-3 whitespace-pre-line rounded-xl bg-night-950/60 p-3 text-sm text-cloud">{r.reason ?? "Ohne Beschreibung."}</blockquote>

                {r.status === "open" ? (
                  <ActionForm
                    action={reportAction}
                    hidden={{ id: r.id }}
                    className="mt-4"
                    submit={[
                      { label: "Erledigt – keine Folgen", name: "decision", value: "dismissed" },
                      {
                        label: "Profil sperren",
                        name: "decision",
                        value: "blocked",
                        tone: "danger",
                        confirm: "Das gemeldete Profil sperren? Offene Plätze werden freigegeben und erstattet, die Person bekommt eine neutrale E-Mail.",
                      },
                    ]}
                  >
                    <textarea name="note" rows={2} maxLength={2000} placeholder="Notiz (intern, optional)" className={`${field} w-full`} />
                  </ActionForm>
                ) : (
                  <p className="mt-3 text-sm text-mist">
                    {r.status === "blocked" ? "Profil gesperrt" : "Erledigt ohne Folgen"} am {day(r.resolved_at)}
                    {r.admin_note && ` · Notiz: ${r.admin_note}`}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
