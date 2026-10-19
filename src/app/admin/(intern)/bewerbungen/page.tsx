import type { Metadata } from "next";
import Link from "next/link";
import { Chip, Empty, Notice, PageTitle, Pager, Tabs, field } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { APP_STATUS, GENDER, day, relative } from "@/lib/admin/format";
import { WAITLIST_REASONS } from "@/lib/admin/ops";
import { type ApplicationStatus, type Db, db } from "@/lib/db";

export const metadata: Metadata = { title: "Bewerbungen" };

const PER_PAGE = 40;

const FILTERS = [
  { key: "pruefen", label: "Zur Prüfung" },
  { key: "neu", label: "Warten auf Antwort" },
  { key: "wartet", label: "Warten auf Tisch" },
  { key: "warteliste", label: "Warteliste" },
  { key: "angenommen", label: "Angenommen" },
  { key: "gespraech", label: "Im Gespräch" },
  { key: "gesperrt", label: "Gesperrt" },
  { key: "abgelehnt", label: "Abgelehnt" },
  { key: "alle", label: "Alle" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];

type CountRow = { status: ApplicationStatus; under_review: boolean; available_since: string | null };
type Row = CountRow & {
  id: string;
  created_at: string;
  first_name: string;
  email: string;
  phone: string | null;
  waitlist_reason: keyof typeof WAITLIST_REASONS | null;
  founder: boolean;
  no_shows: number;
  submitted_at: string | null;
  photo_path: string | null;
  alter: number | null;
  geschlecht: string | null;
  sucht: string[] | null;
  typ: string | null;
};

const COLUMNS =
  "id, created_at, status, first_name, email, phone, under_review, waitlist_reason, available_since, founder, no_shows, submitted_at, photo_path, " +
  "alter:profile->alter, geschlecht:profile->>geschlecht, sucht:profile->sucht, typ:profile->persoenlichkeit->>typ";

function inFilter(filter: Filter, a: CountRow) {
  switch (filter) {
    case "pruefen":
      return a.under_review && a.status !== "blocked";
    case "neu":
      return a.status === "submitted";
    case "wartet":
      return a.status === "accepted" && !a.under_review && a.available_since !== null;
    case "warteliste":
      return a.status === "waitlist";
    case "angenommen":
      return a.status === "accepted";
    case "gespraech":
      return a.status === "onboarding";
    case "gesperrt":
      return a.status === "blocked";
    case "abgelehnt":
      return a.status === "rejected";
    default:
      return true;
  }
}

function listQuery(client: Db, filter: Filter, search: string, page: number) {
  let q = client.from("applications").select(COLUMNS, { count: "exact" });
  if (filter === "pruefen") q = q.eq("under_review", true).neq("status", "blocked");
  if (filter === "neu") q = q.eq("status", "submitted");
  if (filter === "wartet") q = q.eq("status", "accepted").eq("under_review", false).not("available_since", "is", null);
  if (filter === "warteliste") q = q.eq("status", "waitlist");
  if (filter === "angenommen") q = q.eq("status", "accepted");
  if (filter === "gespraech") q = q.eq("status", "onboarding");
  if (filter === "gesperrt") q = q.eq("status", "blocked");
  if (filter === "abgelehnt") q = q.eq("status", "rejected");

  // Suche nach Vorname, E-Mail oder Handynummer – Sonderzeichen raus, damit die Abfrage intakt bleibt
  const text = search.replace(/[^\p{L}\p{N}@._+\- ]/gu, "").trim().slice(0, 60);
  const digits = search.replace(/\D/g, "");
  const parts = text ? [`first_name.ilike."%${text}%"`, `email.ilike."%${text}%"`] : [];
  if (digits.length >= 4) parts.push(`phone.like."%${digits}%"`);
  if (parts.length) q = q.or(parts.join(","));

  const [column, ascending] =
    filter === "wartet"
      ? ["available_since", true]
      : filter === "neu" || filter === "warteliste"
        ? ["submitted_at", true]
        : ["created_at", false];
  return q.order(column, { ascending, nullsFirst: false }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
}

function info(a: Row) {
  if (a.status === "submitted") return `eingereicht ${relative(a.submitted_at)}`;
  if (a.status === "accepted" && a.available_since && !a.under_review) return `wartet ${relative(a.available_since).replace(/^vor /, "seit ")}`;
  if (a.status === "accepted" && !a.available_since) return "gerade nicht verfügbar";
  return `Bewerbung vom ${day(a.created_at)}`;
}

export default async function ApplicationsPage({ searchParams }: PageProps<"/admin/bewerbungen">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as Filter) : "alle";
  const search = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, Number(sp.seite) || 1);

  const client = db();
  const [all, list] = await Promise.all([
    client.from("applications").select("status, under_review, available_since"),
    listQuery(client, filter, search, page),
  ]);
  const counts = (all.data ?? []) as CountRow[];
  const rows = (list.data ?? []) as unknown as Row[];
  const pages = Math.ceil((list.count ?? 0) / PER_PAGE);
  const href = (f: Filter, p = 1) => `/admin/bewerbungen?${new URLSearchParams({ filter: f, ...(search ? { q: search } : {}), ...(p > 1 ? { seite: String(p) } : {}) })}`;

  return (
    <>
      <PageTitle title="Bewerbungen" sub="Alle Profile – mit Foto, Gespräch und KI-Auswertung in der Detailansicht." />
      {sp.geloescht && (
        <div className="mb-4">
          <Notice tone="green">Das Profil wurde endgültig gelöscht.</Notice>
        </div>
      )}
      <Tabs active={filter} items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: href(f.key), count: counts.filter((a) => inFilter(f.key, a)).length }))} />

      <form className="mb-5 flex gap-2" action="/admin/bewerbungen">
        <input type="hidden" name="filter" value={filter} />
        <input name="q" defaultValue={search} placeholder="Vorname, E-Mail oder Nummer" className={`${field} min-w-0 flex-1`} />
        <button className="rounded-full border border-white/15 px-4 py-2 text-sm hover:border-white/30">Suchen</button>
      </form>

      {list.error && <Notice tone="red">Datenbank: {list.error.message}</Notice>}
      {rows.length === 0 ? (
        <Empty>{search ? "Nichts gefunden." : "Hier ist gerade niemand."}</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/bewerbungen/${a.id}`}
                className="glass flex flex-col gap-2 rounded-2xl p-4 transition hover:border-gold-400/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.first_name}</span>
                    <Chip tone={APP_STATUS[a.status].tone}>{APP_STATUS[a.status].label}</Chip>
                    {a.status === "waitlist" && a.waitlist_reason && <Chip tone="amber">{WAITLIST_REASONS[a.waitlist_reason]}</Chip>}
                    {a.under_review && a.status !== "blocked" && <Chip tone="amber">zur Prüfung</Chip>}
                    {a.founder && <Chip tone="gold">★ Gründungsmitglied</Chip>}
                    {a.no_shows > 0 && <Chip tone="red">{a.no_shows}× nicht erschienen</Chip>}
                    {!a.photo_path && a.status !== "onboarding" && <Chip tone="red">kein Foto</Chip>}
                  </div>
                  <div className="mt-1 text-sm text-mist">
                    {[
                      a.alter ? `${a.alter} Jahre` : null,
                      a.geschlecht ? GENDER[a.geschlecht] : null,
                      a.sucht?.length ? `sucht ${a.sucht.map((g) => GENDER[g] ?? g).join(" & ")}` : null,
                      a.typ,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "noch kein Profil"}
                  </div>
                  <div className="truncate text-sm text-mist">
                    {a.email}
                    {a.phone ? ` · +${a.phone}` : ""}
                  </div>
                </div>
                <div className="flex-none text-sm text-mist sm:text-right">{info(a)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pages={pages} href={(p) => href(filter, p)} />
    </>
  );
}
