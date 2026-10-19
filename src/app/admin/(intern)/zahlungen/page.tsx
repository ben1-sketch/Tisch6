import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Chip, Empty, Notice, PageTitle, PersonLink, Stat, Tabs } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { day, when } from "@/lib/admin/format";
import { FOUNDER, euro } from "@/lib/config";
import { type Payment, db } from "@/lib/db";
import { stripeTestMode } from "@/lib/stripe";
import { refundAction } from "../../actions";

export const metadata: Metadata = { title: "Zahlungen" };

type Row = Payment & { applications: { first_name: string } | null };
type ManualRow = {
  id: string;
  price_cents: number | null;
  confirmed_at: string | null;
  application_id: string;
  applications: { first_name: string } | null;
  dinners: { id: string; starts_at: string } | null;
};

export default async function PaymentsPage({ searchParams }: PageProps<"/admin/zahlungen">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = sp.filter === "bezahlt" || sp.filter === "erstattet" ? sp.filter : "alle";
  const client = db();

  let q = client.from("payments").select("*, applications(first_name)");
  if (filter === "bezahlt") q = q.eq("status", "paid");
  if (filter === "erstattet") q = q.eq("status", "refunded");
  const [list, all, founders, manual] = await Promise.all([
    q.order("created_at", { ascending: false }).limit(200),
    client.from("payments").select("amount_cents, status"),
    client.from("packages").select("id", { count: "exact", head: true }).eq("kind", "founder"),
    client
      .from("seats")
      .select("id, price_cents, confirmed_at, application_id, applications(first_name), dinners(id, starts_at)")
      .eq("paid_with", "manual")
      .order("confirmed_at", { ascending: false })
      .limit(50),
  ]);
  const rows = (list.data ?? []) as unknown as Row[];
  const sums = ((all.data ?? []) as Pick<Payment, "amount_cents" | "status">[]).reduce(
    (acc, p) => ({ total: acc.total + p.amount_cents, refunded: acc.refunded + (p.status === "refunded" ? p.amount_cents : 0) }),
    { total: 0, refunded: 0 },
  );
  const manualRows = (manual.data ?? []) as unknown as ManualRow[];
  const stripeBase = `https://dashboard.stripe.com/${stripeTestMode() ? "test/" : ""}payments/`;

  return (
    <>
      <PageTitle title="Zahlungen" sub="Tischteilnahmen und Gründungspakete über Stripe. Essen und Getränke zahlen die Gäste im Lokal." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Eingenommen" value={euro(sums.total)} />
        <Stat label="Erstattet" value={euro(sums.refunded)} />
        <Stat label="Netto" value={euro(sums.total - sums.refunded)} />
        <Stat label="Gründungspakete" value={`${founders.count ?? 0} / ${FOUNDER.limit}`} />
      </div>

      <Tabs
        active={filter}
        items={[
          { key: "alle", label: "Alle", href: "/admin/zahlungen" },
          { key: "bezahlt", label: "Bezahlt", href: "/admin/zahlungen?filter=bezahlt" },
          { key: "erstattet", label: "Erstattet", href: "/admin/zahlungen?filter=erstattet" },
        ]}
      />
      {list.error && <Notice tone="red">Datenbank: {list.error.message}</Notice>}
      {rows.length === 0 ? (
        <Empty>Noch keine Zahlungen.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li key={p.id} className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-semibold">{euro(p.amount_cents)}</span>
                  <span>{p.kind === "package" ? "Gründungspaket" : "Tischteilnahme"}</span>
                  <Chip tone={p.status === "paid" ? "green" : "amber"}>{p.status === "paid" ? "bezahlt" : `erstattet ${day(p.refunded_at)}`}</Chip>
                </div>
                <div className="mt-1 text-mist">
                  {when(p.created_at)} · <PersonLink id={p.application_id} name={p.applications?.first_name} />
                  {p.stripe_payment_intent && (
                    <>
                      {" · "}
                      <a href={`${stripeBase}${p.stripe_payment_intent}`} target="_blank" rel="noreferrer" className="text-rose-300 hover:underline">
                        in Stripe ↗
                      </a>
                    </>
                  )}
                </div>
              </div>
              {p.status === "paid" && p.stripe_payment_intent && (
                <ActionForm
                  action={refundAction}
                  hidden={{ id: p.id }}
                  submit="Erstatten"
                  tone="danger"
                  confirm={`${euro(p.amount_cents)} vollständig erstatten? Die Person bekommt eine E-Mail.${p.kind === "package" ? " Das Paket ist danach aufgebraucht." : ""}`}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-mist">
        Eine gebuchte Tischteilnahme erstattest du am besten beim jeweiligen Tisch („Platz stornieren“) – dann rückt auch jemand nach. Teilbeträge gehen
        direkt in Stripe.
      </p>

      {manualRows.length > 0 && (
        <Card title="Von Hand bestätigte Plätze" className="mt-6">
          <ul className="divide-y divide-white/5 text-sm">
            {manualRows.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <PersonLink id={s.application_id} name={s.applications?.first_name} />
                  {s.dinners && (
                    <>
                      {" · "}
                      <Link href={`/admin/tische/${s.dinners.id}`} className="hover:underline">
                        Tisch {day(s.dinners.starts_at)}
                      </Link>
                    </>
                  )}
                </span>
                <span className="text-mist">
                  {euro(s.price_cents ?? 0)} · {day(s.confirmed_at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
