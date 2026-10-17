import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin-Sitzung ohne Datenbank: Cookie „v1.<ablauf>.<signatur>“.
 * Der Schlüssel hängt am Passwort – ein neues ADMIN_PASSWORD meldet alle bisherigen Sitzungen ab.
 * Ohne „server-only“, weil auch der Proxy damit prüft.
 */

export const ADMIN_COOKIE = "tisch6_admin";
export const SESSION_HOURS = 12;
export const MIN_PASSWORD_LENGTH = 12;

export function passwordStatus(): "ok" | "missing" | "short" {
  const pw = process.env.ADMIN_PASSWORD ?? "";
  if (!pw) return "missing";
  return pw.length < MIN_PASSWORD_LENGTH ? "short" : "ok";
}

function password() {
  return passwordStatus() === "ok" ? process.env.ADMIN_PASSWORD! : null;
}

function signature(payload: string, pw: string) {
  const key = createHash("sha256").update(`tisch6-admin:${pw}`).digest();
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Vergleich in konstanter Zeit, auch bei unterschiedlich langen Eingaben */
function same(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function checkPassword(input: string) {
  const pw = password();
  return pw !== null && same(input, pw);
}

export function createSessionToken(now = Date.now()) {
  const pw = password();
  if (!pw) throw new Error("ADMIN_PASSWORD fehlt");
  const expires = now + SESSION_HOURS * 3600_000;
  const payload = `v1.${expires}`;
  return { value: `${payload}.${signature(payload, pw)}`, expires: new Date(expires) };
}

export function verifySessionToken(token: string | undefined, now = Date.now()) {
  const pw = password();
  if (!pw || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires < now) return false;
  return same(parts[2], signature(`v1.${parts[1]}`, pw));
}

/** Nur Ziele innerhalb des Adminbereichs – nie auf fremde Seiten weiterleiten */
export function safeAdminPath(path: unknown) {
  return typeof path === "string" && /^\/admin(\/|\?|$)/.test(path) ? path : "/admin";
}
