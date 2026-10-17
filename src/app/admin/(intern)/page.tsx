import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Chip, Empty, Notice, PageTitle, Stat } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { DINNER_STATUS, relative, when } from "@/lib/admin/format";
import { FOUNDER, TABLE, euro } from "@/lib/config";
import { type AdminLog, type DinnerStatus, db } from "@/lib/db";
import { DAY, HOUR, WEEKDAY_CODES, addDays, viennaDate, viennaToUtc, weekdayOf } from "@/lib/time";
import { TIMING } from "@/lib/config";
import { planTablesAction, tickAction } from "../actions";

export const metadata: Metadata = { title: "Übersicht" };
// „Durchlauf jetzt starten“ darf so lange laufen wie der automatische Durchlauf
export const maxDuration = 60;

type AppRow = { status: string; under_review: boolean; available_since: string | null; gender: string | null; created_at: string };
type DinnerRow = { id: string; starts_at: string; status: DinnerStatus; restaurants: { name: string } | null; seats: { status: string }[] };
type PaymentRow = { amount_cents: number; status: string; created_at: string };

function setupChecks(activeRestaurants: number, lastTick: string | null, migrated: boolean, migratedV4: boolean) {
  const env = process.env;
  const twilio = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && (env.TWILIO_MESSAGING_SERVICE_SID || env.TWILIO_FROM));
  const tickRunning = lastTick !== null && new Date(lastTick).getTime() > Date.now();
  const tickAge = lastTick ? Date.now() - new Date(lastTick).getTime() : null;
  const ranEver = lastTick !== null && new Date(lastTick).getTime() > 0;
  return [
    { label: "Datenbank Etappe 3 (0005_etappe3_admin.sql)", ok: migrated },
    { label: "Datenbank Brief v4 (0006_brief_v4.sql)", ok: migratedV4 },
    { label: "Claude API (ANTHROPIC_API_KEY)", ok: Boolean(env.ANTHROPIC_API_KEY) },
    { label: "Foto-Verschlüsselung (PHOTO_ENCRYPTION_KEY)", ok: (env.PHOTO_ENCRYPTION_KEY ?? "").length >= 32 },
    { label: "E-Mails (RESEND_API_KEY)", ok: Boolean(env.RESEND_API_KEY), hint: env.RESEND_API_KEY ? undefined : "ohne: E-Mails werden nur protokolliert" },
    { label: "Absender (EMAIL_FROM)", ok: Boolean(env.EMAIL_FROM) },
    { label: "Hinweise ans Team (ADMIN_EMAIL)", ok: Boolean(env.ADMIN_EMAIL) },
    { label: "Zahlungen (STRIPE_SECRET_KEY)", ok: Boolean(env.STRIPE_SECRET_KEY), hint: env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "Testmodus" : undefined },
    { label: "Stripe-Webhook (STRIPE_WEBHOOK_SECRET)", ok: Boolean(env.STRIPE_WEBHOOK_SECRET) },
    { label: "SMS (Twilio)", ok: twilio, hint: twilio ? undefined : "ohne: SMS werden nur protokolliert" },
    { label: "Notfallnummer am Abend (EMERGENCY_PHONE)", ok: Boolean(env.EMERGENCY_PHONE), hint: env.EMERGENCY_PHONE ? undefined : "ohne: keine Notfall-SMS am Tag des Tisches" },
    { label: "Schutz des Durchlaufs (CRON_SECRET)", ok: Boolean(env.CRON_SECRET) },
    { label: "Adresse der Website (NEXT_PUBLIC_SITE_URL)", ok: Boolean(env.NEXT_PUBLIC_SITE_URL) },
    { label: "Aktives Partnerlokal", ok: activeRestaurants > 0, href: "/admin/lokale" },
    {
      label: "Automatischer Durchlauf alle 10 Minuten",
      ok: tickRunning || (tickAge !== null && ranEver && tickAge < 30 * 60_000),
      hint: tickRunning ? "läuft gerade" : ranEver ? `zuletzt ${relative(lastTick)}` : "lief noch nie",
    },
  ];
}

/** Alle Zahlen für die Übersicht in einem Rutsch */
async function loadOverview() {
  const client = db();
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  const today = viennaDate(new Date(now));
  // Woche ab Montag 0 Uhr (Wien)
  const weekStart = viennaToUtc(addDays(today, -((WEEKDAY_CODES.indexOf(weekdayOf(today)) + 6) % 7)), "00:00").getTime();
  const [apps, dinners, reports, payments, founders, matches, failed, tick, restaurants, log, failedLogins, v4] = await Promise.all([
    client.from("applications").select("status, under_review, available_since, gender:profile->>geschlecht, created_at"),
    client
      .from("dinners")
      .select("id, starts_at, status, restaurants(name), seats(status)")
      .in("status", ["inviting", "confirmed"])
      .gte("starts_at", iso(now - 6 * HOUR))
      .order("starts_at")
      .limit(8),
    client.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    client.from("payments").select("amount_cents, status, created_at"),
    client.from("packages").select("id", { count: "exact", head: true }).eq("kind", "founder"),
    client.from("matches").select("id", { count: "exact", head: true }),
    client.from("notifications").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", iso(now - 7 * DAY)),
    client.from("job_locks").select("locked_until").eq("name", "tick").maybeSingle(),
    client.from("restaurants").select("id", { count: "exact", head: true }).eq("active", true),
    client.from("admin_log").select("*").neq("action", "Anmeldung fehlgeschlagen").order("created_at", { ascending: false }).limit(10),
    client
      .from("admin_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "Anmeldung fehlgeschlagen")
      .gte("created_at", iso(now - DAY)),
    client.from("affinities").select("id", { count: "exact", head: true }),
  ]);
  return { now, weekStart, apps, dinners, reports, payments, founders, matches, failed, tick, restaurants, log, failedLogins, v4 };
}

export default async function AdminHome() {
  await requireAdmin();
  const { now, weekStart, apps, dinners, reports, payments, founders, matches, failed, tick, restaurants, log, failedLogins, v4 } = await loadOverview();

  const errors = [apps, dinners, reports, payments, founders, matches, failed, tick, restaurants]
    .map((r) => r.error?.message)
    .filter((m): m is string => Boolean(m));

  const rows = (apps.data ?? []) as unknown as AppRow[];
  const count = (f: (a: AppRow) => boolean) => rows.filter(f).length;
  const waiting = (g: string) => count((a) => a.status === "accepted" && !a.under_review && a.available_since !== null && a.gender === g);
  const accepted = (g?: string) => count((a) => a.status === "accepted" && (!g || a.gender === g));
  const review = count((a) => a.under_review && a.status !== "blocked");
  const pays = (payments.data ?? []) as PaymentRow[];
  const net = pays.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount_cents, 0);
  const week = pays.filter((p) => p.status === "paid" && new Date(p.created_at).getTime() >= weekStart).reduce((sum, p) => sum + p.amount_cents, 0);
  const waitlisted = (g: string) => count((a) => a.status === "waitlist" && a.gender === g);
  const upcoming = (dinners.data ?? []) as unknown as DinnerRow[];
  const checks = setupChecks(restaurants.count ?? 0, (tick.data as { locked_until: string } | null)?.locked_until ?? null, !log.error, !v4.error);
  const missing = checks.filter((c) => !c.ok).length;

  return (
    <>
      <PageTitle title="Übersicht" sub="Was gerade läuft – und was eine Entscheidung braucht." />

      <div className="space-y-3">
        {errors.length > 0 && (
          <Notice tone="red">
            Datenbank: {errors[0]} – sind alle SQL-Dateien aus <code>supabase/migrations</code> ausgeführt?
          </Notice>
        )}
        {(failed.count ?? 0) > 0 && (
          <Notice>
            {failed.count} {failed.count === 1 ? "Nachricht konnte" : "Nachrichten konnten"} in den letzten 7 Tagen nicht zugestellt werden.{" "}
            <Link href="/admin/versand?filter=fehler" className="underline">
              Ansehen
            </Link>
          </Notice>
        )}
        {(failedLogins.count ?? 0) >= 3 && (
          <Notice tone="red">
            {failedLogins.count} fehlgeschlagene Anmeldeversuche in den letzten 24 Stunden. Bei Verdacht ADMIN_PASSWORD in Vercel ändern.
          </Notice>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Zur Prüfung" value={review} tone={review ? "amber" : undefined} href="/admin/bewerbungen?filter=pruefen" />
        <Stat label="Offene Meldungen" value={reports.count ?? 0} tone={reports.count ? "red" : undefined} href="/admin/meldungen" />
        <Stat
          label="Warten auf einen Tisch"
          value={waiting("frau") + waiting("mann")}
          hint={`${waiting("frau")} Frauen · ${waiting("mann")} Männer`}
          href="/admin/bewerbungen?filter=wartet"
        />
        <Stat
          label="Frauen : Männer"
          value={`${accepted("frau")} : ${accepted("mann")}`}
          hint={`angenommen · Warteliste ${waitlisted("frau")} : ${waitlisted("mann")}`}
          href="/admin/bewerbungen?filter=angenommen"
        />
        <Stat
          label="Warten auf Antwort"
          value={count((a) => a.status === "submitted")}
          hint={`Warteliste: ${count((a) => a.status === "waitlist")}`}
          href="/admin/bewerbungen?filter=neu"
        />
        <Stat
          label="Neu in 7 Tagen"
          value={count((a) => new Date(a.created_at).getTime() > now - 7 * DAY)}
          hint={`${count((a) => a.status === "onboarding")} noch im Gespräch`}
          href="/admin/bewerbungen"
        />
        <Stat label="Gründungsmitglieder" value={`${founders.count ?? 0} / ${FOUNDER.limit}`} href="/admin/zahlungen" />
        <Stat label="Umsatz diese Woche" value={euro(week)} hint={`gesamt netto ${euro(net)}`} href="/admin/zahlungen" />
        <Stat label="Wiedersehen" value={matches.count ?? 0} hint="gegenseitige Matches" href="/admin/wiedersehen" />
        <Stat label="Geplante Tische" value={upcoming.length} href="/admin/tische" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card title="Nächste Tische" aside={<Link href="/admin/tische" className="text-sm text-rose-300 hover:underline">alle</Link>}>
            {upcoming.length === 0 ? (
              <Empty>Noch kein Tisch geplant. Sobald drei Frauen und drei Männer zusammenpassen, plant die KI den Tisch – jede Nacht.</Empty>
            ) : (
              <ul className="divide-y divide-white/5">
                {upcoming.map((d) => {
                  const fixed = d.seats.filter((s) => s.status === "confirmed").length;
                  const open = d.seats.filter((s) => s.status === "invited" || s.status === "offered").length;
                  return (
                    <li key={d.id}>
                      <Link href={`/admin/tische/${d.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-rose-200">
                        <span className="min-w-0">
                          <span className="block font-medium">{when(d.starts_at)}</span>
                          <span className="text-sm text-mist">{d.restaurants?.name ?? "–"}</span>
                        </span>
                        <span className="flex items-center gap-2 text-sm">
                          <span className={fixed >= TABLE.size ? "text-emerald-300" : "text-cloud"}>
                            {fixed}/{TABLE.size} fix
                          </span>
                          {open > 0 && <span className="text-mist">{open} offen</span>}
                          <Chip tone={DINNER_STATUS[d.status].tone}>{DINNER_STATUS[d.status].label}</Chip>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Letzte Eingriffe" aside={<Link href="/admin/protokoll" className="text-sm text-rose-300 hover:underline">Protokoll</Link>}>
            {log.error ? (
              <Empty>Das Protokoll gibt es nach dem Ausführen von 0005_etappe3_admin.sql.</Empty>
            ) : (log.data ?? []).length === 0 ? (
              <Empty>Noch keine Eingriffe.</Empty>
            ) : (
              <ul className="space-y-2 text-sm">
                {((log.data ?? []) as AdminLog[]).map((entry) => (
                  <li key={entry.id} className="flex flex-wrap justify-between gap-x-3">
                    <span>
                      {entry.action}
                      {entry.detail && <span className="text-mist"> · {entry.detail}</span>}
                      {entry.application_id && (
                        <Link href={`/admin/bewerbungen/${entry.application_id}`} className="ml-2 text-rose-300 hover:underline">
                          Profil
                        </Link>
                      )}
                      {entry.dinner_id && (
                        <Link href={`/admin/tische/${entry.dinner_id}`} className="ml-2 text-rose-300 hover:underline">
                          Tisch
                        </Link>
                      )}
                    </span>
                    <span className="text-mist">{relative(entry.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Automatischer Durchlauf">
            <p className="text-sm text-mist">
              Beantwortet Bewerbungen, plant Tische, verschickt Einladungen und Erinnerungen, sucht Nachrücker und fragt nach dem Abend nach
              dem Wiedersehen. Läuft alle 10 Minuten von selbst – hier kannst du ihn sofort starten.
            </p>
            <ActionForm action={tickAction} submit="Durchlauf jetzt starten" tone="primary" className="mt-4" />
            <p className="mt-4 text-sm text-mist">
              Neue Tische plant die KI jede Nacht zwischen {TIMING.matchingFromHour} und {TIMING.matchingToHour} Uhr – die Einladungen liegen morgens im
              Postfach. Brauchst du sie früher:
            </p>
            <ActionForm
              action={planTablesAction}
              submit="Tische jetzt planen"
              confirm="Jetzt Tische planen? Passende Runden bekommen sofort ihre Einladungen."
              className="mt-2"
            />
          </Card>

          <Card title="Einrichtung" aside={missing ? <Chip tone="amber">{missing} offen</Chip> : <Chip tone="green">alles bereit</Chip>}>
            <ul className="space-y-2 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex gap-2">
                  <span className={c.ok ? "text-emerald-300" : "text-amber-200"} aria-hidden="true">
                    {c.ok ? "✓" : "○"}
                  </span>
                  <span className="min-w-0">
                    {c.href && !c.ok ? (
                      <Link href={c.href} className="underline">
                        {c.label}
                      </Link>
                    ) : (
                      c.label
                    )}
                    {c.hint && <span className="text-mist"> – {c.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
