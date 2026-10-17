import type { Metadata } from "next";
import Link from "next/link";
import { Empty, Notice, PageTitle, Pager } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { when } from "@/lib/admin/format";
import { type AdminLog, db } from "@/lib/db";

export const metadata: Metadata = { title: "Protokoll" };

const PER_PAGE = 50;

export default async function LogPage({ searchParams }: PageProps<"/admin/protokoll">) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.seite) || 1);
  const { data, error, count } = await db()
    .from("admin_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const rows = (data ?? []) as AdminLog[];

  return (
    <>
      <PageTitle title="Protokoll" sub="Jeder Eingriff im Adminbereich und jede Anmeldung – ohne Namen, damit gelöschte Profile wirklich weg sind." />
      {error && <Notice tone="red">Das Protokoll gibt es nach dem Ausführen von 0005_etappe3_admin.sql ({error.message}).</Notice>}
      {rows.length === 0 ? (
        <Empty>Noch keine Einträge.</Empty>
      ) : (
        <ul className="divide-y divide-white/5 text-sm">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className={e.action === "Anmeldung fehlgeschlagen" ? "text-red-300" : ""}>
                {e.action}
                {e.detail && e.action !== "Anmeldung fehlgeschlagen" && <span className="text-mist"> · {e.detail}</span>}
                {e.application_id && (
                  <Link href={`/admin/bewerbungen/${e.application_id}`} className="ml-2 text-rose-300 hover:underline">
                    Profil
                  </Link>
                )}
                {e.dinner_id && (
                  <Link href={`/admin/tische/${e.dinner_id}`} className="ml-2 text-rose-300 hover:underline">
                    Tisch
                  </Link>
                )}
              </span>
              <span className="text-mist">{when(e.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pages={Math.ceil((count ?? 0) / PER_PAGE)} href={(p) => `/admin/protokoll?seite=${p}`} />
    </>
  );
}
