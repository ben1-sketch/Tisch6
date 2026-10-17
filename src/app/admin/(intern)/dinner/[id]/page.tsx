import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Chip, Empty, Facts, PageTitle, PersonLink, field } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { DINNER_STATUS, GENDER, SEAT_STATUS, day, relative, when } from "@/lib/admin/format";
import { PRICES, TABLE, TIMING, euro } from "@/lib/config";
import { type AdminLog, type Application, type Dinner, type Feedback, type Match, type Report, type Restaurant, type Seat, type SeatStatus, TAKING_PART, db } from "@/lib/db";
import type { Person } from "@/lib/matching-core";
import { replacementCandidates } from "@/lib/seats";
import { formatDateTime, hoursUntil } from "@/lib/time";
import {
  cancelDinnerAction,
  confirmManuallyAction,
  extendInviteAction,
  inviteAction,
  noShowAction,
  removeSeatAction,
  replaceNowAction,
  resendReservationAction,
  revertNoShowAction,
} from "../../../actions";

export const metadata: Metadata = { title: "Dinner" };

type SeatRow = Seat & { applications: Pick<Application, "id" | "first_name" | "status" | "no_shows" | "profile"> | null };
type FeedbackRow = Feedback & { seats: { dinner_id: string; application_id: string } };

const ORDER: SeatStatus[] = ["confirmed", "attended", "no_show", "invited", "offered", "cancelled_late", "cancelled", "removed", "declined", "expired", "postponed", "withdrawn"];
const PAID_WITH = { stripe: "online bezahlt", package: "mit Guthaben", manual: "von Hand bestätigt" } as const;

function average(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1).replace(".", ",") : "–";
}

export default async function DinnerPage({ params }: PageProps<"/admin/dinner/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const client = db();
  const dinner = (await client.from("dinners").select("*").eq("id", id).maybeSingle()).data as Dinner | null;
  if (!dinner) notFound();

  const [restaurant, seats, feedback, matches, reports, log] = await Promise.all([
    client.from("restaurants").select("*").eq("id", dinner.restaurant_id).maybeSingle(),
    client.from("seats").select("*, applications(id, first_name, status, no_shows, profile)").eq("dinner_id", id),
    client.from("feedback").select("*, seats!inner(dinner_id, application_id)").eq("seats.dinner_id", id),
    client.from("matches").select("*").eq("dinner_id", id),
    client.from("reports").select("*").eq("dinner_id", id).order("created_at", { ascending: false }),
    client.from("admin_log").select("*").eq("dinner_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  const place = restaurant.data as Restaurant | null;
  const seatRows = ((seats.data ?? []) as unknown as SeatRow[]).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const feedbackRows = (feedback.data ?? []) as unknown as FeedbackRow[];
  const matchRows = (matches.data ?? []) as Match[];
  const reportRows = (reports.data ?? []) as Report[];
  const names = new Map(seatRows.map((s) => [s.application_id, s.applications?.first_name ?? "Profil"]));

  const planned = dinner.status === "inviting" || dinner.status === "confirmed";
  const future = hoursUntil(dinner.starts_at) > 0;
  const started = !future;
  const candidates = planned && future ? await replacementCandidates(client, dinner.id, 5).catch(() => null) : null;
  const missing = candidates ? candidates.missing.frau + candidates.missing.mann : 0;
  const fixed = seatRows.filter((s) => TAKING_PART.includes(s.status)).length;
  const matching = dinner.matching as { begruendung?: string } | null;
  const hidden = { id: dinner.id };

  return (
    <>
      <PageTitle
        title={formatDateTime(new Date(dinner.starts_at))}
        sub={
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={DINNER_STATUS[dinner.status].tone}>{DINNER_STATUS[dinner.status].label}</Chip>
            <span>
              {place?.name ?? "–"}
              {place?.district ? ` · ${place.district}` : ""}
            </span>
            <span>
              · {fixed}/{TABLE.size} {started ? "Gäste" : "fix"}
            </span>
          </div>
        }
      >
        <Link href="/admin/dinner" className="text-sm text-rose-300 hover:underline">
          ← alle Dinner
        </Link>
      </PageTitle>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          <Card title="Plätze">
            {seatRows.length === 0 ? (
              <Empty>Keine Plätze.</Empty>
            ) : (
              <ul className="space-y-3">
                {seatRows.map((s) => {
                  const p = s.applications?.profile;
                  const open = s.status === "invited" || s.status === "offered";
                  return (
                    <li key={s.id} className="rounded-xl border border-white/10 p-3 sm:p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <PersonLink id={s.application_id} name={s.applications?.first_name} />
                          <span className="text-sm text-mist">
                            {" "}
                            · {[p?.alter, p?.geschlecht ? GENDER[p.geschlecht] : null, p?.persoenlichkeit.typ].filter(Boolean).join(" · ")}
                          </span>
                          {s.replacement && (
                            <span className="ml-2">
                              <Chip tone="blue">Nachrücker</Chip>
                            </span>
                          )}
                        </div>
                        <Chip tone={SEAT_STATUS[s.status].tone}>{SEAT_STATUS[s.status].label}</Chip>
                      </div>
                      <p className="mt-1 text-sm text-mist">
                        {open && s.expires_at && `Frist bis ${when(s.expires_at)} (${relative(s.expires_at)})`}
                        {open && s.checkout_started_at && ` · Bezahlseite geöffnet ${relative(s.checkout_started_at)}`}
                        {s.paid_with && `${PAID_WITH[s.paid_with]}${s.price_cents !== null ? ` · ${euro(s.price_cents)}` : ""}`}
                        {s.confirmed_at && ` · fix seit ${when(s.confirmed_at)}`}
                        {s.ended_at && !open && ` · beendet ${when(s.ended_at)}`}
                        {p?.unvertraeglichkeiten?.length ? ` · Küche: ${p.unvertraeglichkeiten.join(", ")}` : ""}
                      </p>
                      {s.icebreaker?.fragen?.length ? (
                        <details className="mt-2 text-sm">
                          <summary className="cursor-pointer text-rose-300">Eisbrecher-Karte</summary>
                          <ol className="mt-1 list-decimal pl-5 text-cloud">
                            {s.icebreaker.fragen.map((q) => (
                              <li key={q}>{q}</li>
                            ))}
                          </ol>
                        </details>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-3">
                        {open && planned && (
                          <>
                            <ActionForm action={extendInviteAction} hidden={{ id: s.id }} submit="Frist +24 h" />
                            <ActionForm
                              action={confirmManuallyAction}
                              hidden={{ id: s.id }}
                              submit="Von Hand bestätigen"
                              confirm="Platz ohne Online-Zahlung bestätigen (z. B. bar bezahlt)? Die Person bekommt die Bestätigung per E-Mail."
                            >
                              <input name="price" inputMode="decimal" defaultValue={String(PRICES.seat / 100)} aria-label="Betrag in Euro" className={`${field} w-20`} />
                            </ActionForm>
                            <ActionForm
                              action={removeSeatAction}
                              hidden={{ id: s.id }}
                              submit="Einladung zurückziehen"
                              tone="danger"
                              confirm="Einladung zurückziehen? Die Person bekommt eine kurze E-Mail."
                            >
                              <label className="flex items-center gap-2 text-sm text-mist">
                                <input type="checkbox" name="replace" defaultChecked className="h-4 w-4 accent-rose-400" />
                                Nachrücker suchen
                              </label>
                            </ActionForm>
                          </>
                        )}
                        {s.status === "confirmed" && future && (
                          <ActionForm
                            action={removeSeatAction}
                            hidden={{ id: s.id }}
                            submit="Platz stornieren"
                            tone="danger"
                            confirm="Diesen Platz stornieren? Die Person bekommt eine E-Mail."
                          >
                            <label className="flex items-center gap-2 text-sm text-mist">
                              <input type="checkbox" name="refund" defaultChecked className="h-4 w-4 accent-rose-400" />
                              erstatten
                            </label>
                            <label className="flex items-center gap-2 text-sm text-mist">
                              <input type="checkbox" name="replace" defaultChecked className="h-4 w-4 accent-rose-400" />
                              Nachrücker suchen
                            </label>
                          </ActionForm>
                        )}
                        {(s.status === "attended" || (s.status === "confirmed" && started)) && (
                          <ActionForm
                            action={noShowAction}
                            hidden={{ id: s.id }}
                            submit="Nicht erschienen"
                            tone="danger"
                            confirm="Als nicht erschienen markieren? Die Person bekommt eine E-Mail; beim zweiten Mal wird das Profil gesperrt."
                          />
                        )}
                        {s.status === "no_show" && <ActionForm action={revertNoShowAction} hidden={{ id: s.id }} submit="Doch da gewesen" />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {candidates && missing > 0 && (
            <Card title="Passende Nachrücker" aside={<span className="text-sm text-mist">wer am längsten wartet zuerst</span>}>
              {(["frau", "mann"] as const).map((g) =>
                candidates.missing[g] > 0 ? (
                  <div key={g} className="mb-4 last:mb-0">
                    <h3 className="mb-2 text-sm font-medium">
                      Es fehlt {candidates.missing[g]} {g === "frau" ? (candidates.missing[g] === 1 ? "Frau" : "Frauen") : candidates.missing[g] === 1 ? "Mann" : "Männer"}
                    </h3>
                    {candidates.candidates[g].length === 0 ? (
                      <p className="text-sm text-mist">Gerade passt niemand aus dem Pool (Alter, Wunschtag, Altersspannen).</p>
                    ) : (
                      <ul className="space-y-2">
                        {candidates.candidates[g].map((c: Person) => (
                          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 p-3 text-sm">
                            <span>
                              <PersonLink id={c.id} name={c.firstName} />
                              <span className="text-mist">
                                {" "}
                                · {c.age} · {c.typ} · wartet {relative(new Date(c.waitingSince).toISOString()).replace(/^vor /, "seit ")}
                              </span>
                            </span>
                            <ActionForm
                              action={inviteAction}
                              hidden={{ id: dinner.id, person: c.id }}
                              submit="Einladen"
                              confirm={`${c.firstName} einladen? E-Mail + SMS, ${TIMING.replacementHours} Stunden Zeit zum Zusagen.`}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null,
              )}
            </Card>
          )}

          {matching?.begruendung && (
            <Card title="Warum diese Runde">
              <p className="text-sm text-cloud">{matching.begruendung}</p>
              <p className="mt-2 text-xs text-mist">Begründung der KI bei der Tischwahl (ohne Namen erstellt).</p>
            </Card>
          )}

          {(feedbackRows.length > 0 || matchRows.length > 0) && (
            <Card
              title="Nach dem Abend"
              aside={
                <span className="text-sm text-mist">
                  Abend {average(feedbackRows.map((f) => f.rating_evening))} · Runde {average(feedbackRows.map((f) => f.rating_table))} ({feedbackRows.length}{" "}
                  Rückmeldungen)
                </span>
              }
            >
              <ul className="space-y-2 text-sm">
                {matchRows.map((m) => (
                  <li key={m.id}>
                    ♥ <PersonLink id={m.a_id} name={names.get(m.a_id)} /> und <PersonLink id={m.b_id} name={names.get(m.b_id)} /> möchten sich wiedersehen
                  </li>
                ))}
                {feedbackRows
                  .filter((f) => f.improve)
                  .map((f) => (
                    <li key={f.seat_id} className="text-mist">
                      <PersonLink id={f.seats.application_id} name={names.get(f.seats.application_id)} />: „{f.improve}“
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          {reportRows.length > 0 && (
            <Card title="Meldungen zu diesem Abend">
              <ul className="space-y-2 text-sm">
                {reportRows.map((r) => (
                  <li key={r.id}>
                    <PersonLink id={r.reported_id} name={r.reported_id ? names.get(r.reported_id) : null} /> gemeldet von{" "}
                    <PersonLink id={r.reporter_id} name={r.reporter_id ? names.get(r.reporter_id) : null} /> · {day(r.created_at)} ·{" "}
                    <Link href="/admin/meldungen" className="text-rose-300 hover:underline">
                      {r.status === "open" ? "offen – jetzt prüfen" : "erledigt"}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Lokal">
            {place ? (
              <Facts
                rows={[
                  ["Name", place.name],
                  ["Adresse", place.address],
                  ["Reservierung an", place.email ?? "ADMIN_EMAIL (keine E-Mail beim Lokal)"],
                  ["Telefon", place.phone ?? "–"],
                  ["Gemeldete Personen", dinner.reserved_count !== null ? String(dinner.reserved_count) : "noch nicht reserviert"],
                ]}
              />
            ) : (
              <Empty>Lokal nicht gefunden.</Empty>
            )}
          </Card>

          <Card title="Eingreifen">
            {planned ? (
              <div className="space-y-4">
                {future && missing > 0 && (
                  <ActionForm action={replaceNowAction} hidden={hidden} submit="Nächsten Nachrücker einladen" tone="primary" />
                )}
                {dinner.status === "confirmed" && (
                  <ActionForm
                    action={resendReservationAction}
                    hidden={hidden}
                    submit="Reservierung erneut senden"
                    confirm="Die Reservierung mit aktueller Personenzahl und Küchenhinweisen noch einmal ans Lokal schicken?"
                  />
                )}
                <ActionForm
                  action={cancelDinnerAction}
                  hidden={hidden}
                  submit="Dinner absagen"
                  tone="danger"
                  confirm="Das ganze Dinner absagen? Alle Gäste bekommen eine E-Mail, Zahlungen werden erstattet und das Lokal bekommt eine Stornierung."
                />
                <p className="text-xs text-mist">
                  {dinner.status === "inviting"
                    ? `${TIMING.decisionHoursBefore} Stunden vorher entscheidet der Durchlauf: ab ${TABLE.size - 1} Zusagen findet es statt, sonst wird verschoben und erstattet.`
                    : "Das Dinner findet statt. Fällt jemand aus, läuft es zu fünft – alle bekommen dann beim nächsten Mal Rabatt."}
                </p>
              </div>
            ) : (
              <p className="text-sm text-mist">Dieses Dinner ist {DINNER_STATUS[dinner.status].label.toLowerCase()} – hier gibt es nichts mehr zu tun.</p>
            )}
          </Card>

          <Card title="Ablauf">
            <Facts
              rows={[
                ["Geplant", when(dinner.created_at)],
                ["Feedback angefragt", when(dinner.feedback_sent_at)],
                ["Abgeschlossen", when(dinner.wrapped_up_at)],
              ]}
            />
          </Card>

          <Card title="Protokoll">
            {((log.data ?? []) as AdminLog[]).length === 0 ? (
              <Empty>Noch keine Eingriffe.</Empty>
            ) : (
              <ul className="space-y-1 text-sm">
                {((log.data ?? []) as AdminLog[]).map((e) => (
                  <li key={e.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {e.action}
                      {e.detail && <span className="text-mist"> · {e.detail}</span>}
                    </span>
                    <span className="text-mist">{relative(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
