import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoMark } from "@/components/Logo";
import { isAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { logout } from "../actions";

/** Zahlen in der Navigation: offene Meldungen und Profile, die auf eine Entscheidung warten */
async function badges(): Promise<Record<string, number>> {
  if (!(await isAdmin())) return {};
  try {
    const client = db();
    const [reports, review] = await Promise.all([
      client.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      client.from("applications").select("id", { count: "exact", head: true }).eq("under_review", true).neq("status", "blocked"),
    ]);
    return { "/admin/meldungen": reports.count ?? 0, "/admin/bewerbungen": review.count ?? 0 };
  } catch {
    return {};
  }
}

export default async function InternLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-night-900/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            <Link href="/admin" className="flex items-center gap-2 font-display font-semibold">
              <LogoMark className="h-7 w-7" />
              <span>
                Tisch<span className="text-rose-400">6</span>
              </span>
              <span className="text-sm font-normal text-mist">Admin</span>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <a href="/de" target="_blank" rel="noreferrer" className="hidden rounded-full px-3 py-1.5 text-mist hover:text-cloud sm:inline">
                Website ↗
              </a>
              <form action={logout}>
                <button className="rounded-full border border-white/15 px-3 py-1.5 text-mist hover:border-white/30 hover:text-cloud">Abmelden</button>
              </form>
            </div>
          </div>
          <AdminNav badges={await badges()} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
