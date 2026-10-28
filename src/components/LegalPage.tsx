import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="prose-legal mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <p className="!text-sm">Stand: {updated}</p>
      {children}
    </article>
  );
}
