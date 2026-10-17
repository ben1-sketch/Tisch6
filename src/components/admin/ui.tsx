import Link from "next/link";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/admin/format";
import type { Notification } from "@/lib/db";

/** Eingabefelder im Adminbereich */
export const field = "rounded-xl border border-white/15 bg-night-950/60 px-3 py-2 text-sm text-cloud placeholder:text-mist/50";

const TONES: Record<Tone, string> = {
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  blue: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  red: "border-red-400/40 bg-red-500/10 text-red-300",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  mist: "border-white/10 bg-white/5 text-mist",
};

export function Chip({ children, tone = "mist" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {sub && <div className="mt-1 text-sm text-mist">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, aside, children, className = "" }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-2xl p-4 sm:p-5 ${className}`}>
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-display text-base font-semibold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: Tone }) {
  const body = (
    <>
      <div className="text-xs text-mist">{label}</div>
      <div className={`mt-1 font-display text-2xl font-semibold ${tone === "red" ? "text-red-300" : tone === "amber" ? "text-amber-200" : ""}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-mist">{hint}</div>}
    </>
  );
  const cls = "glass block rounded-2xl p-4";
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-rose-400/40`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Beschriftete Werte, auf dem Handy untereinander */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-white/5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-3 py-2 sm:grid-cols-[11rem_1fr]">
          <dt className="text-mist">{label}</dt>
          <dd className="min-w-0 break-words text-cloud">{value ?? "–"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-mist">{children}</p>;
}

export function Notice({ tone = "amber", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${TONES[tone]}`}>{children}</div>;
}

/** Filter als Pillen-Leiste – auf dem Handy seitlich wischbar */
export function Tabs({ items, active }: { items: { key: string; label: string; href: string; count?: number | null }[]; active: string }) {
  return (
    <nav className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`flex-none rounded-full border px-3.5 py-1.5 text-sm transition ${
            item.key === active ? "border-rose-400 bg-rose-400 font-medium text-night-950" : "border-white/10 text-mist hover:border-white/25 hover:text-cloud"
          }`}
        >
          {item.label}
          {item.count != null && <span className="ml-1.5 opacity-70">{item.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  const link = "rounded-full border border-white/10 px-4 py-2 text-sm hover:border-white/25";
  return (
    <div className="mt-6 flex items-center justify-center gap-3 text-sm">
      {page > 1 && (
        <Link className={link} href={href(page - 1)}>
          ← zurück
        </Link>
      )}
      <span className="text-mist">
        Seite {page} von {pages}
      </span>
      {page < pages && (
        <Link className={link} href={href(page + 1)}>
          weiter →
        </Link>
      )}
    </div>
  );
}

/** Achse von 1 bis 5 als Balken mit den beiden Polen */
export function Axis({ left, right, value }: { left: string; right: string; value: number | null | undefined }) {
  const v = Math.min(5, Math.max(1, Math.round(value ?? 3)));
  return (
    <div className="text-xs">
      <div className="flex justify-between text-mist">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <div className="mt-1 grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-2 rounded-full ${n === v ? "bg-rose-400" : "bg-white/10"}`} />
        ))}
      </div>
    </div>
  );
}

export function PersonLink({ id, name }: { id: string | null; name: string | null | undefined }) {
  if (!id) return <span className="text-mist">gelöscht</span>;
  return (
    <Link href={`/admin/bewerbungen/${id}`} className="text-rose-300 underline-offset-2 hover:underline">
      {name || "Profil"}
    </Link>
  );
}

const NOTIFICATION_STATUS = {
  sent: ["verschickt", "green"],
  logged: ["nur protokolliert", "mist"],
  failed: ["fehlgeschlagen", "red"],
  pending: ["wird verschickt", "blue"],
} as const;

export function NotificationChip({ status }: { status: Notification["status"] }) {
  const [label, tone] = NOTIFICATION_STATUS[status];
  return <Chip tone={tone}>{label}</Chip>;
}
