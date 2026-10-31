import type { Metadata } from "next";
import { MarkFailuresSeen } from "@/components/admin/MarkFailuresSeen";
import { Empty, Notice, NotificationChip, PageTitle, Pager, PersonLink, Tabs } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { when } from "@/lib/admin/format";
import { type Notification, db } from "@/lib/db";

export const metadata: Metadata = { title: "Versand" };

const PER_PAGE = 50;
const FILTERS = [
  { key: "alle", label: "Alle" },
  { key: "fehler", label: "Fehlgeschlagen" },
  { key: "protokolliert", label: "Nur protokolliert" },
  { key: "email", label: "E-Mails" },
  { key: "sms", label: "SMS" },
  { key: "push", label: "Push (App)" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

export default async function NotificationsPage({ searchParams }: PageProps<"/admin/versand">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as Filter) : "alle";
  const page = Math.max(1, Number(sp.seite) || 1);

  let q = db().from("notifications").select("*", { count: "exact" });
  if (filter === "fehler") q = q.eq("status", "failed");
  if (filter === "protokolliert") q = q.eq("status", "logged");
  if (filter === "email") q = q.eq("channel", "email");
  if (filter === "sms") q = q.eq("channel", "sms");
  if (filter === "push") q = q.eq("channel", "push");
  const { data, error, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const rows = (data ?? []) as Notification[];

  return (
    <>
      <PageTitle
        title="Versand"
        sub="Jede E-Mail, SMS und Push-Nachricht, die Tisch6 verschickt. Hat ein Gast in der App Benachrichtigungen an, kommt statt der SMS eine Push-Nachricht. „Nur protokolliert“ heißt: Resend bzw. Twilio ist noch nicht eingerichtet."
      />
      <Tabs active={filter} items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: `/admin/versand?filter=${f.key}` }))} />
      {filter === "fehler" && <MarkFailuresSeen />}
      {error && <Notice tone="red">Datenbank: {error.message}</Notice>}
      {rows.length === 0 ? (
        <Empty>Nichts hier.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id} className="glass flex flex-col gap-1 rounded-2xl p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate">
                  <span className="text-mist">{n.channel === "sms" ? "SMS" : n.channel === "push" ? "Push" : "E-Mail"} · </span>
                  {n.subject ?? n.kind}
                </div>
                <div className="truncate text-mist">
                  an {n.recipient}
                  {n.application_id && (
                    <>
                      {" · "}
                      <PersonLink id={n.application_id} name="Profil" />
                    </>
                  )}
                  {" · "}
                  {n.kind}
                </div>
                {n.error && <div className="truncate text-xs text-red-300">{n.error}</div>}
              </div>
              <div className="flex flex-none items-center gap-2 text-mist">
                {when(n.created_at)}
                <NotificationChip status={n.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pages={Math.ceil((count ?? 0) / PER_PAGE)} href={(p) => `/admin/versand?filter=${filter}&seite=${p}`} />
    </>
  );
}
