import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Chip, Empty, Facts, PageTitle, PersonLink, field } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { DINNER_STATUS, GENDER, SEAT_STATUS, day, relative, when } from "@/lib/admin/format";
import { PRICES, TABLE, TIMING, euro } from "@/lib/config";
import {
  type AdminLog,
  type Application,
  type Dinner,
  type Feedback,
  type Match,
  type Report,
  type Restaurant,
  type Seat,
  type SeatStatus,
  TAKING_PART,
  db,
} from "@/lib/db";
import type { Person } from "@/lib/matching-core";
import { CARD_RULES, RESERVATION_NAME } from "@/lib/messages";
import { replacementCandidates } from "@/lib/seats";
import { dateKey, formatDateTime, formatTime, hoursUntil, viennaDate } from "@/lib/time";
import {
  cancelDinnerAction,
  cardAction,
  confirmManuallyAction,
  extendInviteAction,
  inviteAction,
  moveDinnerAction,
  noShowAction,
  removeSeatAction,
  replaceNowAction,
  resendReservationAction,
  revertNoShowAction,
} from "../../../actions";

export const metadata: Metadata = { title: "Tisch" };

type SeatRow = Seat & { applications: Pick<Application, "id" | "first_name" | "status" | "no_shows" | "profile"> | null };
type FeedbackRow = Feedback & { seats: { dinner_id: string; application_id: string } };

const ORDER: SeatStatus[] = ["confirmed", "attended", "no_show", "invited", "offered", "cancelled_late", "cancelled", "removed", "declined", "expired", "postponed", "withdrawn"];
const PAID_WITH = { stripe: "online bezahlt", package: "mit Guthaben", manual: "von Hand bestätigt" } as const;

function average(values: (number | null)[]) {
  const v = values.filter((x): x is number => x !== null);
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1).replace(".", ",") : "–";
}

/** Zeitpunkt als Wert für <input type="datetime-local"> in Wiener Zeit */
function localInput(iso: string) {
  const d = new Date(iso);
  return `${dateKey(viennaDate(d))}T${formatTime(d)}`;
}

export default async function TablePage({ params }: PageProps<"/admin/tische/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const client = db();
  const dinner = (await client.from("dinners").select("*").eq("id", id).maybeSingle()).data as Dinner | null;
  if (!dinner) notFound();

  const [restaurants, seats, feedback, matches, reports, log] = await Promise.all([
    client.from("restaurants").select("*").order("name"),
    client.from("seats").select("*, applications(id, first_name, status, no_shows, profile)").eq("dinner_id", id),
    client.from("feedback").select("*, seats!inner(dinner_id, application_id)").eq("seats.dinner_id", id),
    client.from("matches").select("*").eq("dinner_id", id),
    client.from("reports").select("*").eq("dinner_id", id).order("created_at", { ascending: false }),
    client.from("admin_log").select("*").eq("dinner_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  const allRestaurants = (restaurants.data ?? []) as Restaurant[];
  const place = allRestaurants.find((r) => r.id === dinner.restaurant_id) ?? null;
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
  const card = dinner.conversation_card;
  const hidden = { id: dinner.id };

  return (
    <>
      <PageTitle
        title={formatDateTime(new Date(dinner.starts_at))}
        sub={
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={DINNER_STATUS[dinner.status].tone}>{DINNER_STATUS[dinner.status].label}</Chip>
            {dinner.moved_at && <Chip tone="amber">verschoben {day(dinner.moved_at)}</Chip>}
            <span>
              {place?.name ?? "–"}
              {place?.district ? ` · ${place.district}` : ""}
            </span>
            <span>
              · {fixed}/{TABLE.size} {started ? "Gäste" : "bezahlt"}
            </span>
          </div>
        }
      >
        <Link href="/admin/tische" className="text-sm text-gold-300 hover:underline">
          ← alle Tische
        </Link>
      </PageTitle>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Card title="Teilnehmer" aside={<span className="text-xs text-mist">rot = unbezahlt</span>}>
            {seatRows.length === 0 ? (
              <Empty>Keine Plätze.</Empty>
            ) : (
              <ul className="space-y-3">
                {seatRows.map((s) => {
                  const p = s.applications?.profile;
                  const open = s.status === "invited" || s.status === "offered";
                  return (
                    <li key={s.id} className={`rounded-xl border p-3 sm:p-4 ${open ? "border-red-400/40 bg-red-500/5" : "border-white/10"}`}>
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
                        {open ? <Chip tone="red">unbezahlt</Chip> : <Chip tone={SEAT_STATUS[s.status].tone}>{SEAT_STATUS[s.status].label}</Chip>}
                      </div>
                      <p className="mt-1 text-sm text-mist">
                        {open && s.expires_at && `Frist bis ${when(s.expires_at)} (${relative(s.expires_at)})`}
                        {open && s.checkout_started_at && ` · Bezahlseite geöffnet ${relative(s.checkout_started_at)}`}
                        {s.paid_with && `${PAID_WITH[s.paid_with]}${s.price_cents !== null ? ` · ${euro(s.price_cents)}` : ""}`}
                        {s.confirmed_at && ` · fix seit ${when(s.confirmed_at)}`}
                        {s.ended_at && !open && ` · beendet ${when(s.ended_at)}`}
                        {p?.unvertraeglichkeiten?.length ? ` · Küche: ${p.unvertraeglichkeiten.join(", ")}` : ""}
                      </p>

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
                                <input type="checkbox" name="replace" defaultChecked className="h-4 w-4 accent-gold-400" />
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
                              <input type="checkbox" name="refund" defaultChecked className="h-4 w-4 accent-gold-400" />
                              erstatten
                            </label>
                            <label className="flex items-center gap-2 text-sm text-mist">
                              <input type="checkbox" name="replace" defaultChecked className="h-4 w-4 accent-gold-400" />
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
                      <p className="text-sm text-mist">Gerade passt niemand aus dem Pool (Alter, Temperament, Wunschtag, Altersspannen).</p>
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

          <Card
            title="Gesprächskarte"
            aside={
              card ? (
                <a href={`/admin/karte/${dinner.id}`} target="_blank" rel="noreferrer" className="text-sm text-gold-300 hover:underline">
                  Druckversion ↗
                </a>
              ) : null
            }
          >
            {card ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  {card.runden.map((r) => (
                    <div key={r.name}>
                      <h3 className="text-sm font-semibold text-gold-300">{r.name}</h3>
                      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-cloud">
                        {r.fragen.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-mist">{CARD_RULES.join(" · ")}</p>
                {planned && future && (
                  <ActionForm
                    action={cardAction}
                    hidden={{ ...hidden, renew: "1" }}
                    submit="Neue Fragen erstellen"
                    confirm="Die KI erstellt neue Fragen für diesen Tisch. Weiter?"
                    className="mt-4"
                  />
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-mist">
                  Die KI erstellt die Karte automatisch, sobald der Tisch fix ist (spätestens am Tag selbst). Am Tag des Tisches kommt sie per E-Mail an alle.
                </p>
                {planned && <ActionForm action={cardAction} hidden={hidden} submit="Jetzt erstellen" className="mt-3" />}
              </>
            )}
          </Card>

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
                {feedbackRows
                  .filter((f) => f.quote)
                  .map((f) => (
                    <li key={`${f.seat_id}-quote`} className="text-cloud">
                      Der Abend in einem Satz: „{f.quote}“ {f.quote_ok ? <Chip tone="green">darf zitiert werden</Chip> : <Chip tone="mist">nur intern</Chip>}
                    </li>
                  ))}
              </ul>
            </Card>
          )}

          {reportRows.length > 0 && (
            <Card title="Meldungen zu diesem Tisch">
              <ul className="space-y-2 text-sm">
                {reportRows.map((r) => (
                  <li key={r.id}>
                    <PersonLink id={r.reported_id} name={r.reported_id ? names.get(r.reported_id) : null} /> gemeldet von{" "}
                    <PersonLink id={r.reporter_id} name={r.reporter_id ? names.get(r.reporter_id) : null} /> · {day(r.created_at)} ·{" "}
                    <Link href="/admin/meldungen" className="text-gold-300 hover:underline">
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
                  ["Reserviert auf", RESERVATION_NAME],
                  ["Reservierung an", place.email ?? "ADMIN_EMAIL (keine E-Mail beim Lokal)"],
                  ["Telefon", place.phone ?? "–"],
                  ["Gemeldete Personen", dinner.reserved_count !== null ? String(dinner.reserved_count) : "noch nicht reserviert"],
                ]}
              />
            ) : (
              <Empty>Lokal nicht gefunden.</Empty>
            )}
            {dinner.status === "confirmed" && (
              <ActionForm
                action={resendReservationAction}
                hidden={hidden}
                submit="Reservierung erneut senden"
                confirm="Die Reservierung mit aktueller Personenzahl und Küchenhinweisen noch einmal ans Lokal schicken?"
                className="mt-3"
              />
            )}
          </Card>

          {planned ? (
            <Card title="Verschieben / Absagen">
              <div className="space-y-5">
                {future && missing > 0 && <ActionForm action={replaceNowAction} hidden={hidden} submit="Nächsten Nachrücker einladen" tone="primary" />}
                <ActionForm
                  action={moveDinnerAction}
                  hidden={hidden}
                  submit="Verschieben"
                  confirm="Tisch verschieben? Alle Teilnehmer bekommen sofort eine SMS und eine E-Mail; wer nicht kann, sagt kostenlos ab."
                >
                  <label className="block w-full text-sm">
                    <span className="mb-1 block text-mist">Neuer Termin</span>
                    <input type="datetime-local" name="when" required defaultValue={localInput(dinner.starts_at)} className={`${field} w-full`} />
                  </label>
                  <label className="block w-full text-sm">
                    <span className="mb-1 block text-mist">Lokal</span>
                    <select name="restaurant" defaultValue={dinner.restaurant_id} className={`${field} w-full`}>
                      {allRestaurants.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                          {r.active ? "" : " (pausiert)"}
                        </option>
                      ))}
                    </select>
                  </label>
                </ActionForm>
                <ActionForm
                  action={cancelDinnerAction}
                  hidden={hidden}
                  submit="Tisch absagen"
                  tone="danger"
                  confirm="Den ganzen Tisch absagen? Alle Teilnehmer bekommen sofort eine SMS und eine E-Mail, das Lokal eine Stornierung."
                  className="border-t border-white/5 pt-4"
                >
                  <fieldset className="w-full space-y-1 text-sm text-mist">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="money" value="credit" defaultChecked className="accent-gold-400" />
                      Bezahltes bleibt als Guthaben
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" name="money" value="refund" className="accent-gold-400" />
                      Geld zurück
                    </label>
                  </fieldset>
                </ActionForm>
                <p className="text-xs text-mist">
                  {dinner.decided_at
                    ? "Der Tisch findet statt. Fällt jemand aus, läuft er zu fünft – alle bekommen dann beim nächsten Mal Rabatt."
                    : `${TIMING.decisionHoursBefore} Stunden vorher entscheidet der Durchlauf: ab ${TABLE.minGuests} bezahlten Plätzen findet der Tisch statt, sonst wird er abgesagt und Bezahltes bleibt als Guthaben.`}
                </p>
              </div>
            </Card>
          ) : (
            <Card title="Verschieben / Absagen">
              <p className="text-sm text-mist">Dieser Tisch ist {DINNER_STATUS[dinner.status].label.toLowerCase()} – hier gibt es nichts mehr zu tun.</p>
            </Card>
          )}

          <Card title="Ablauf">
            <Facts
              rows={[
                ["Geplant", when(dinner.created_at)],
                ["Entschieden", when(dinner.decided_at)],
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
