import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActionForm } from "@/components/admin/ActionForm";
import { Axis, Card, Chip, Empty, Facts, NotificationChip, PageTitle, PersonLink, field } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { APP_STATUS, DINNER_STATUS, GENDER, SEAT_STATUS, day, relative, when } from "@/lib/admin/format";
import { WAITLIST_REASONS } from "@/lib/admin/ops";
import { PRICES, euro } from "@/lib/config";
import {
  type AdminLog,
  type Application,
  type DinnerStatus,
  type Discount,
  type Feedback,
  type Match,
  type Notification,
  type Package,
  type Payment,
  type Report,
  type Seat,
  db,
} from "@/lib/db";
import {
  acceptAction,
  availabilityAction,
  blockAction,
  clearReviewAction,
  creditAction,
  deleteAction,
  discountAction,
  noteAction,
  rejectAction,
  unblockAction,
  waitlistAction,
} from "../../../actions";

export const metadata: Metadata = { title: "Profil" };

type SeatRow = Seat & { dinners: { id: string; starts_at: string; status: DinnerStatus; restaurants: { name: string } | null } | null };
type FeedbackRow = Feedback & { seats: { application_id: string; dinner_id: string } };

const PAID_WITH = { stripe: "online bezahlt", package: "mit Guthaben", manual: "von Hand bestätigt" } as const;
const DISCOUNT_REASON = { referral: "Empfehlung", five_person: "Abend zu fünft", manual: "vom Team" } as const;
const yesNo = (v: boolean | null | undefined) => (v === null || v === undefined ? "–" : v ? "ja" : "nein");

export default async function ApplicationPage({ params }: PageProps<"/admin/bewerbungen/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const client = db();
  const app = (await client.from("applications").select("*").eq("id", id).maybeSingle()).data as Application | null;
  if (!app) notFound();

  const [seats, payments, packages, discounts, reportsAbout, reportsBy, feedback, matches, notifications, log, referred, companions] =
    await Promise.all([
      client.from("seats").select("*, dinners(id, starts_at, status, restaurants(name))").eq("application_id", id).order("created_at", { ascending: false }),
      client.from("payments").select("*").eq("application_id", id).order("created_at", { ascending: false }),
      client.from("packages").select("*").eq("application_id", id).order("created_at", { ascending: false }),
      client.from("discounts").select("*").eq("application_id", id).order("created_at", { ascending: false }),
      client.from("reports").select("*").eq("reported_id", id).order("created_at", { ascending: false }),
      client.from("reports").select("*").eq("reporter_id", id).order("created_at", { ascending: false }),
      client.from("feedback").select("*, seats!inner(application_id, dinner_id)").eq("seats.application_id", id).order("created_at", { ascending: false }),
      client.from("matches").select("*").or(`a_id.eq.${id},b_id.eq.${id}`).order("created_at", { ascending: false }),
      client.from("notifications").select("*").eq("application_id", id).order("created_at", { ascending: false }).limit(40),
      client.from("admin_log").select("*").eq("application_id", id).order("created_at", { ascending: false }).limit(30),
      client.from("applications").select("id, first_name, status").eq("referred_by", id),
      client.from("applications").select("id, first_name").eq("buddy_id", id),
    ]);

  const seatRows = (seats.data ?? []) as unknown as SeatRow[];
  const about = (reportsAbout.data ?? []) as Report[];
  const by = (reportsBy.data ?? []) as Report[];
  const matchRows = (matches.data ?? []) as Match[];
  const feedbackRows = (feedback.data ?? []) as unknown as FeedbackRow[];

  // Vornamen aller Personen, die hier verlinkt werden
  const otherIds = [
    ...matchRows.map((m) => (m.a_id === id ? m.b_id : m.a_id)),
    ...about.map((r) => r.reporter_id),
    ...by.map((r) => r.reported_id),
    app.referred_by,
    app.buddy_id,
  ].filter((x): x is string => Boolean(x));
  const names = new Map<string, string>();
  if (otherIds.length) {
    const { data } = await client.from("applications").select("id, first_name").in("id", [...new Set(otherIds)]);
    for (const row of (data ?? []) as { id: string; first_name: string }[]) names.set(row.id, row.first_name);
  }

  const p = app.profile;
  const hidden = { id: app.id };
  const active = ["submitted", "accepted", "waitlist"].includes(app.status);
  const evaluation = app.evaluation as { serioes?: boolean; eindeutig?: boolean; warnsignale?: string[]; begruendung?: string } | null;
  const decision =
    app.status === "accepted"
      ? "angenommen"
      : app.status === "rejected"
        ? "abgelehnt"
        : app.status === "waitlist"
          ? app.waitlist_reason === "review"
            ? "zur Prüfung durch dich"
            : "Warteliste"
          : app.status === "submitted"
            ? "folgt innerhalb von 24 Stunden"
            : "–";

  return (
    <>
      <PageTitle
        title={app.first_name}
        sub={
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={APP_STATUS[app.status].tone}>{APP_STATUS[app.status].label}</Chip>
            {app.status === "waitlist" && app.waitlist_reason && <Chip tone="amber">{WAITLIST_REASONS[app.waitlist_reason]}</Chip>}
            {app.under_review && app.status !== "blocked" && <Chip tone="amber">zur Prüfung</Chip>}
            {app.founder && <Chip tone="gold">★ Gründungsmitglied</Chip>}
            {app.no_shows > 0 && <Chip tone="red">{app.no_shows}× nicht erschienen</Chip>}
            {app.status === "accepted" && <Chip tone={app.available_since ? "green" : "mist"}>{app.available_since ? "wartet auf Tisch" : "pausiert"}</Chip>}
          </div>
        }
      >
        <Link href="/admin/bewerbungen" className="text-sm text-gold-300 hover:underline">
          ← alle Bewerbungen
        </Link>
      </PageTitle>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card title="Verifizierungsfoto">
            {app.photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element -- privat, verschlüsselt, darf nicht durch die Bildoptimierung
              <img src={`/admin/foto/${app.id}`} alt={`Verifizierungsfoto von ${app.first_name}`} className="w-full rounded-xl bg-night-950 object-cover" />
            ) : (
              <Empty>Kein Foto hochgeladen.</Empty>
            )}
            <p className="mt-2 text-xs text-mist">Nur für das Team sichtbar. Passt das Foto nicht zur Person am Abend: sperren.</p>
          </Card>

          <Card title="Kontakt">
            <Facts
              rows={[
                ["E-Mail", <a key="m" href={`mailto:${app.email}`} className="text-gold-300 hover:underline">{app.email}</a>],
                ["Handy", app.phone ? <a key="p" href={`tel:+${app.phone}`} className="text-gold-300 hover:underline">+{app.phone}</a> : "–"],
                ["Stadt", app.city === "wien" ? "Wien" : app.city],
                ["Konto seit", when(app.created_at)],
                ["Eingereicht", when(app.submitted_at)],
                ["Angenommen", when(app.accepted_at)],
                ["Zuletzt eingeladen", when(app.last_invited_at)],
                ["Nicht gebucht in Folge", String(app.missed_bookings)],
                ["Einwilligung", `${when(app.consent_at)} (Version ${app.consent_version})`],
              ]}
            />
          </Card>

          <Card title="Eingreifen">
            <div className="space-y-5">
              {(app.status === "submitted" || app.status === "waitlist" || app.status === "rejected") && (
                <ActionForm
                  action={acceptAction}
                  hidden={hidden}
                  submit="Annehmen"
                  tone="primary"
                  confirm={`${app.first_name} annehmen? Die Person bekommt eine E-Mail und kommt in den Pool.`}
                />
              )}
              {active && (
                <ActionForm
                  action={rejectAction}
                  hidden={hidden}
                  submit="Ablehnen"
                  confirm={`${app.first_name} ablehnen? Die Person bekommt eine freundliche Absage per E-Mail; die Daten werden nach 30 Tagen gelöscht.`}
                />
              )}
              {app.under_review && app.status === "accepted" && (
                <ActionForm action={clearReviewAction} hidden={hidden} submit="Prüfung erledigt – wieder einladen" tone="primary" />
              )}
              {app.status === "accepted" && (
                <ActionForm
                  action={availabilityAction}
                  hidden={{ ...hidden, available: app.available_since ? "0" : "1" }}
                  submit={app.available_since ? "Pausieren (keine Einladungen)" : "Wieder für Tische berücksichtigen"}
                />
              )}
              {active && (
                <ActionForm action={waitlistAction} hidden={hidden} submit="Auf die Warteliste" confirm="Auf die Warteliste setzen? Die Person bekommt eine E-Mail.">
                  <select name="reason" defaultValue={app.waitlist_reason ?? "balance"} className={field}>
                    {Object.entries(WAITLIST_REASONS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </ActionForm>
              )}
              {active && (
                <div className="space-y-3 border-t border-white/5 pt-4">
                  <p className="text-xs text-mist">Kulanz – die Person bekommt jeweils eine E-Mail.</p>
                  <ActionForm action={creditAction} hidden={hidden} submit="Gutschreiben" confirm="Freie Tischteilnahme gutschreiben?">
                    <select name="seats" defaultValue="1" className={field}>
                      <option value="1">1 freie Tischteilnahme</option>
                      <option value="2">2 freie Tischteilnahmen</option>
                      <option value="3">3 freie Tischteilnahmen</option>
                    </select>
                  </ActionForm>
                  <ActionForm action={discountAction} hidden={hidden} submit="Rabatt geben" confirm="Rabatt für die nächste Tischteilnahme anlegen?">
                    <label className="text-sm text-mist">
                      nächstes Mal
                      <input name="price" inputMode="decimal" placeholder={String(PRICES.referral / 100)} className={`${field} ml-2 w-20`} /> €
                    </label>
                  </ActionForm>
                </div>
              )}
              <div className="space-y-3 border-t border-white/5 pt-4">
                {app.status === "blocked" ? (
                  <ActionForm action={unblockAction} hidden={hidden} submit="Entsperren" confirm="Sperre aufheben? Die Person kommt wieder in den Pool." />
                ) : (
                  <ActionForm
                    action={blockAction}
                    hidden={hidden}
                    submit="Sperren"
                    tone="danger"
                    confirm="Profil sperren? Offene Einladungen werden zurückgezogen, fixe Plätze erstattet und Nachrücker gesucht."
                  >
                    <label className="flex items-center gap-2 text-sm text-mist">
                      <input type="checkbox" name="notify" defaultChecked className="h-4 w-4 accent-gold-400" />
                      per E-Mail informieren
                    </label>
                  </ActionForm>
                )}
                <ActionForm
                  action={deleteAction}
                  hidden={hidden}
                  submit="Endgültig löschen"
                  tone="danger"
                  confirm={`${app.first_name} endgültig löschen – Profil, Foto, Gespräch und Login? Offene Plätze werden freigegeben und erstattet. Das kann nicht rückgängig gemacht werden.`}
                />
              </div>
            </div>
          </Card>

          <Card title="Interne Notiz">
            <ActionForm action={noteAction} hidden={hidden} submit="Notiz speichern">
              <textarea name="note" rows={4} maxLength={2000} defaultValue={app.admin_note ?? ""} className={`${field} w-full`} placeholder="Nur für das Team sichtbar" />
            </ActionForm>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Profil">
            {p ? (
              <Facts
                rows={[
                  ["Alter", p.alter ?? "–"],
                  ["Geschlecht", p.geschlecht ? GENDER[p.geschlecht] : "–"],
                  ["Möchte kennenlernen", p.sucht.map((g) => GENDER[g] ?? g).join(" & ") || "–"],
                  ["Wunsch-Alter", p.alter_min || p.alter_max ? `${p.alter_min ?? "?"}–${p.alter_max ?? "?"}` : "–"],
                  ["Wunschtage", p.wunschtage.length ? p.wunschtage.map((d) => d[0].toUpperCase() + d[1]).join(", ") : "alle"],
                  ["Raucht", p.rauchen ?? "–"],
                  ["Hat Kinder", yesNo(p.hat_kinder)],
                  ["Kinderwunsch", p.kinderwunsch ?? "–"],
                  ["Beruf", p.beruf ?? "–"],
                  ["Geht aus", p.ausgehen ?? "–"],
                  ["Ernährung", p.ernaehrung ?? "–"],
                  ["Isst gern", p.essensvorlieben.join(", ") || "–"],
                  ["Unverträglichkeiten", p.unvertraeglichkeiten.join(", ") || "keine"],
                  ["Beziehungsziel, Werte", "nutzt nur die KI fürs Matching – wird nirgends angezeigt"],
                ]}
              />
            ) : (
              <Empty>{app.status === "onboarding" ? "Das Gespräch läuft noch." : "Das Profil wird gerade ausgewertet."}</Empty>
            )}
          </Card>

          {p && (
            <Card title="Persönlichkeit" aside={<Chip tone="gold">{p.persoenlichkeit.typ}</Chip>}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Axis left="ruhig" right="extrovertiert" value={p.persoenlichkeit.ruhig_extrovertiert} />
                <Axis left="spontan" right="strukturiert" value={p.persoenlichkeit.spontan_strukturiert} />
                <Axis left="humorvoll" right="ernst" value={p.persoenlichkeit.humorvoll_ernst} />
                <Axis left="bodenständig" right="abenteuerlustig" value={p.persoenlichkeit.bodenstaendig_abenteuerlustig} />
              </div>
              <p className="mt-4 text-sm text-cloud">{p.persoenlichkeit.zusammenfassung}</p>
              <Facts
                rows={[
                  ["Gesprächsthemen", p.gespraechsthemen.join(", ") || "–"],
                  ["Hinweise fürs Matching", p.hinweise_matching || "–"],
                ]}
              />
            </Card>
          )}

          {app.status !== "onboarding" && (
            <Card
              title="KI-Entscheidung"
              aside={
                typeof evaluation?.serioes === "boolean" ? (
                  <Chip tone={evaluation.serioes ? "green" : "red"}>{evaluation.serioes ? "ernst gemeint" : "auffällig"}</Chip>
                ) : null
              }
            >
              <Facts
                rows={[
                  ["Entscheidung", decision],
                  ["Warnsignale", evaluation?.warnsignale?.length ? evaluation.warnsignale.join(", ") : "keine"],
                  ["Begründung", evaluation?.begruendung ?? "–"],
                  ["Geprüft", when(app.evaluated_at)],
                ]}
              />
            </Card>
          )}

          <Card title="Tische">
            {seatRows.length === 0 ? (
              <Empty>Noch an keinem Tisch.</Empty>
            ) : (
              <ul className="divide-y divide-white/5">
                {seatRows.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="min-w-0">
                      {s.dinners ? (
                        <Link href={`/admin/tische/${s.dinners.id}`} className="font-medium hover:text-gold-200">
                          {when(s.dinners.starts_at)} · {s.dinners.restaurants?.name ?? "–"}
                        </Link>
                      ) : (
                        "–"
                      )}
                      <span className="block text-mist">
                        {s.paid_with ? `${PAID_WITH[s.paid_with]}${s.price_cents !== null ? ` · ${euro(s.price_cents)}` : ""}` : s.replacement ? "Nachrücker-Angebot" : "Einladung"}
                        {s.dinners && ` · Tisch: ${DINNER_STATUS[s.dinners.status].label}`}
                      </span>
                    </span>
                    <Chip tone={SEAT_STATUS[s.status].tone}>{SEAT_STATUS[s.status].label}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Zahlungen & Guthaben">
            {!(payments.data ?? []).length && !(packages.data ?? []).length && !(discounts.data ?? []).length ? (
              <Empty>Keine Zahlungen.</Empty>
            ) : (
              <ul className="divide-y divide-white/5 text-sm">
                {((payments.data ?? []) as Payment[]).map((pay) => (
                  <li key={pay.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      {day(pay.created_at)} · {pay.kind === "package" ? "Gründungspaket" : "Tischteilnahme"} · {euro(pay.amount_cents)}
                    </span>
                    <Chip tone={pay.status === "paid" ? "green" : "amber"}>{pay.status === "paid" ? "bezahlt" : `erstattet ${day(pay.refunded_at)}`}</Chip>
                  </li>
                ))}
                {((packages.data ?? []) as Package[]).map((pkg) => (
                  <li key={pkg.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      {pkg.kind === "founder" ? "Gründungspaket" : "Gutschrift"}: noch {pkg.remaining} von {pkg.total}
                    </span>
                    <span className="text-mist">gültig bis {day(pkg.expires_at)}</span>
                  </li>
                ))}
                {((discounts.data ?? []) as Discount[]).map((d) => (
                  <li key={d.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      Rabatt ({DISCOUNT_REASON[d.reason]}): {euro(d.price_cents)}
                    </span>
                    <span className="text-mist">{d.used_at ? `eingelöst ${day(d.used_at)}` : "offen"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Meldungen">
            {about.length === 0 && by.length === 0 ? (
              <Empty>Keine Meldungen.</Empty>
            ) : (
              <ul className="space-y-3 text-sm">
                {about.map((r) => (
                  <li key={r.id} className="rounded-xl border border-red-400/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">Gemeldet am {day(r.created_at)}</span>
                      <Chip tone={r.status === "open" ? "red" : "mist"}>{r.status === "open" ? "offen" : r.status === "blocked" ? "gesperrt" : "erledigt"}</Chip>
                    </div>
                    <p className="mt-1 text-cloud">{r.reason ?? "ohne Beschreibung"}</p>
                    <p className="mt-1 text-mist">
                      von <PersonLink id={r.reporter_id} name={r.reporter_id ? names.get(r.reporter_id) : null} />
                      {r.admin_note && ` · Notiz: ${r.admin_note}`}
                    </p>
                  </li>
                ))}
                {by.map((r) => (
                  <li key={r.id} className="text-mist">
                    Hat am {day(r.created_at)} <PersonLink id={r.reported_id} name={r.reported_id ? names.get(r.reported_id) : null} /> gemeldet
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-mist">
              <Link href="/admin/meldungen" className="underline">
                Alle Meldungen
              </Link>{" "}
              – die gemeldete Person erfährt nie, wer gemeldet hat.
            </p>
          </Card>

          <Card title="Wiedersehen & Feedback">
            {matchRows.length === 0 && feedbackRows.length === 0 ? (
              <Empty>Noch nichts.</Empty>
            ) : (
              <ul className="space-y-2 text-sm">
                {matchRows.map((m) => {
                  const other = m.a_id === id ? m.b_id : m.a_id;
                  return (
                    <li key={m.id}>
                      ♥ Gegenseitiges Wiedersehen mit <PersonLink id={other} name={names.get(other)} /> · {day(m.created_at)}
                    </li>
                  );
                })}
                {feedbackRows.map((f) => (
                  <li key={f.seat_id} className="text-mist">
                    <Link href={`/admin/tische/${f.seats.dinner_id}`} className="text-cloud hover:underline">
                      Feedback vom {day(f.created_at)}
                    </Link>
                    : Abend {f.rating_evening ?? "–"}/5, Runde {f.rating_table ?? "–"}/5, möchte {f.wants_to_see.length} wiedersehen
                    {f.improve && <span className="block text-cloud">„{f.improve}“</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Empfehlungen">
            <Facts
              rows={[
                ["Einladungscode", <code key="c">{app.invite_code}</code>],
                ["Eingeladen von", app.referred_by ? <PersonLink key="r" id={app.referred_by} name={names.get(app.referred_by)} /> : "–"],
                ["Kommt mit", app.buddy_id ? <PersonLink key="b" id={app.buddy_id} name={names.get(app.buddy_id)} /> : "–"],
                [
                  "Hat eingeladen",
                  ((referred.data ?? []) as Pick<Application, "id" | "first_name" | "status">[]).length ? (
                    <span key="i" className="flex flex-wrap gap-x-3">
                      {((referred.data ?? []) as Pick<Application, "id" | "first_name" | "status">[]).map((r) => (
                        <span key={r.id}>
                          <PersonLink id={r.id} name={r.first_name} /> <span className="text-mist">({APP_STATUS[r.status].label})</span>
                        </span>
                      ))}
                    </span>
                  ) : (
                    "–"
                  ),
                ],
                [
                  "Begleitet",
                  ((companions.data ?? []) as Pick<Application, "id" | "first_name">[]).map((c) => c.first_name).join(", ") || "–",
                ],
                ["Empfehlungsrabatt", app.referral_rewarded_at ? `gutgeschrieben ${day(app.referral_rewarded_at)}` : "–"],
              ]}
            />
          </Card>

          <Card title="Kennenlern-Gespräch">
            {app.transcript.length ? (
              <details>
                <summary className="cursor-pointer text-sm text-gold-300">{app.transcript.length} Nachrichten anzeigen</summary>
                <ol className="mt-3 space-y-2">
                  {app.transcript.map((m, i) => (
                    <li
                      key={i}
                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                        m.role === "user" ? "ml-auto bg-gold-400/15 text-cloud" : "bg-night-950/60 text-mist"
                      }`}
                    >
                      {m.content}
                    </li>
                  ))}
                </ol>
              </details>
            ) : (
              <Empty>Kein Gespräch.</Empty>
            )}
          </Card>

          <Card title="Versand">
            {((notifications.data ?? []) as Notification[]).length === 0 ? (
              <Empty>Noch keine Nachrichten.</Empty>
            ) : (
              <ul className="divide-y divide-white/5 text-sm">
                {((notifications.data ?? []) as Notification[]).map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="text-mist">{n.channel === "sms" ? "SMS" : "E-Mail"} · </span>
                      {n.subject ?? n.kind}
                      {n.error && <span className="block truncate text-xs text-red-300">{n.error}</span>}
                    </span>
                    <span className="flex items-center gap-2 text-mist">
                      {relative(n.created_at)}
                      <NotificationChip status={n.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
                    <span className="text-mist">{when(e.created_at)}</span>
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
