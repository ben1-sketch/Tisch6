"use client";

import { useEffect } from "react";
import { markFailuresSeenAction } from "@/app/admin/actions";

/** Merkt sich beim Öffnen der Fehlerliste, dass sie angesehen wurde – der gelbe Hinweis zeigt danach nur neue Fehler */
export function MarkFailuresSeen() {
  useEffect(() => {
    void markFailuresSeenAction();
  }, []);
  return null;
}
