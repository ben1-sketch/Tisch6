import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Empty, Notice, PageTitle, PersonLink, Stat } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { day, when } from "@/lib/admin/format";
import { type Feedback, type Learning, db } from "@/lib/db";
import { learningsAction } from "../../actions";

export const metadata: Metadata = { title: "Feedback" };

type Row = Feedback & { seats: { application_id: string; dinner_id: string; dinners: { starts_at: string } | null } };

function average(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1).replace(".", ",") : "–";
}

export default async function FeedbackPage() {
  await requireAdmin();
  const client = db();
  const [{ data, error }, learnings] = await Promise.all([
    client
      .from("feedback")
      .select("*, seats!inner(application_id, dinner_id, dinners(starts_at))")
      .order("created_at", { ascending: false })
      .limit(200),
    client.from("learnings").select("*").order("created_at", { ascending: false }).limit(3),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const ids = [...new Set(rows.map((r) => r.seats.application_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: apps } = await client.from("applications").select("id, first_name").in("id", ids);
    for (const a of (apps ?? []) as { id: string; first_name: string }[]) names.set(a.id, a.first_name);
  }
  const notes = (learnings.data ?? []) as Learning[];

  return (
    <>
      <PageTitle title="Feedback" sub="Die drei Fragen nach jedem Abend. Die KI fasst sie wöchentlich zu Lernnotizen fürs Matching zusammen." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Rückmeldungen" value={rows.length} hint="die letzten 200" />
        <Stat label="Ø Wie war der Abend?" value={average(rows.map((r) => r.rating_evening))} hint="von 5" />
        <Stat label="Ø Wie hat die Runde gepasst?" value={average(rows.map((r) => r.rating_table))} hint="von 5" />
      </div>

      <Card title="Was die KI gelernt hat" className="mb-6">
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
        <ActionForm action={learningsAction} submit="Jetzt neu auswerten" className="mt-4" />
      </Card>

      {error && <Notice tone="red">Datenbank: {error.message}</Notice>}
      {rows.length === 0 ? (
        <Empty>Noch kein Feedback.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((f) => (
            <li key={f.seat_id} className="glass rounded-2xl p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <PersonLink id={f.seats.application_id} name={names.get(f.seats.application_id)} />
                  <span className="text-mist">
                    {" "}
                    ·{" "}
                    <Link href={`/admin/dinner/${f.seats.dinner_id}`} className="hover:underline">
                      Dinner {day(f.seats.dinners?.starts_at)}
                    </Link>
                  </span>
                </span>
                <span className="text-mist">
                  Abend {f.rating_evening ?? "–"}/5 · Runde {f.rating_table ?? "–"}/5 · ♥ {f.wants_to_see.length}
                  {f.absent.length > 0 && ` · meldet ${f.absent.length} abwesend`}
                </span>
              </div>
              {f.improve && <p className="mt-2 text-cloud">„{f.improve}“</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
