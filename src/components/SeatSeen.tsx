"use client";

import { useEffect } from "react";
import { parseVisitor, visitorSnapshot } from "@/lib/visitor";

/**
 * Meldet, dass der Gast seine offene Einladung geöffnet hat – das zählt als Reaktion: Dann kommt kurz vor Fristende
 * keine letzte Erinnerung per SMS. Nur im echten Browser (Link-Vorschauen und Mail-Scanner führen kein JavaScript aus)
 * und nicht auf Geräten des Tisch6-Teams. Zeigt nichts an.
 */
export function SeatSeen({ token }: { token: string }) {
  useEffect(() => {
    if (parseVisitor(visitorSnapshot())?.status === "team") return;
    fetch(`/api/seat/${token}/gesehen`, { method: "POST", keepalive: true }).catch(() => {});
  }, [token]);
  return null;
}
