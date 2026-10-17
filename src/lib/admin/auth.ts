import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ADMIN_COOKIE, verifySessionToken } from "./session";

/** Ist die aktuelle Anfrage im Adminbereich angemeldet? (pro Render nur einmal geprüft) */
export const isAdmin = cache(async () => verifySessionToken((await cookies()).get(ADMIN_COOKIE)?.value));

/**
 * Zuerst in jeder Admin-Seite, jeder Admin-Aktion und jeder Admin-Route aufrufen –
 * Seiten und Aktionen sind auch direkt erreichbar, der Proxy allein schützt nicht.
 */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export const sessionCookie = {
  name: ADMIN_COOKIE,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/admin",
  },
};
