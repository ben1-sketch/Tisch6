"use client";

import { useEffect } from "react";
import { type VisitorStatus, markVisitor } from "@/lib/visitor";

/** Merkt sich im Browser, dass diese Person schon dabei ist (siehe lib/visitor.ts) – zeigt nichts an. */
export function MarkVisitor({ status, app, keep = false }: { status: VisitorStatus; app?: string; keep?: boolean }) {
  useEffect(() => {
    markVisitor(status, app, keep);
  }, [status, app, keep]);
  return null;
}
