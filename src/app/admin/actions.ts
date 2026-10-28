"use server";

import { createHmac } from "node:crypto";
import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, sessionCookie } from "@/lib/admin/auth";
import {
  AdminError,
  WAITLIST_REASONS,
  acceptApplicant,
  blockApplicant,
  cancelDinner,
  clearReview,
  confirmManually,
  deleteApplicant,
  deleteRestaurant,
  extendInvite,
  grantCredit,
  grantDiscount,
  inviteToDinner,
  logAdmin,
  markNoShow,
  moveDinner,
  refundPayment,
  rejectApplicant,
  removeSeat,
  replaceNow,
  resendReservation,
  resolveReport,
  restaurantFromForm,
  revertNoShow,
  saveNote,
  saveRestaurant,
  sendTestMessages,
  setApplicantAvailability,
  startTestPayment,
  stopCampaigns,
  unblockApplicant,
  waitlistApplicant,
} from "@/lib/admin/ops";
import { checkPassword, createSessionToken, passwordStatus, safeAdminPath } from "@/lib/admin/session";
import { describeTick } from "@/lib/admin/format";
import type { ActionResult, LoginState } from "@/lib/admin/types";
import { type Application, db } from "@/lib/db";
import { ensureConversationCard, updateLearnings } from "@/lib/dinners";
import { loadDinner } from "@/lib/seats";
import { runTick } from "@/lib/tick";

// Jede Aktion ist von außen per POST erreichbar – deshalb prüft jede einzelne die Anmeldung.

function failure(e: unknown): ActionResult {
  if (e instanceof AdminError) return { ok: false, message: e.message };
  console.error("Admin-Aktion fehlgeschlagen:", e);
  return { ok: false, message: `Das hat nicht geklappt: ${e instanceof Error ? e.message : String(e)}` };
}

async function run(task: () => Promise<string>): Promise<ActionResult> {
  await requireAdmin();
  try {
    const message = await task();
    refresh();
    return { ok: true, message };
  } catch (e) {
    return failure(e);
  }
}

function idFrom(form: FormData, key = "id") {
  const parsed = z.uuid().safeParse(form.get(key));
  if (!parsed.success) throw new AdminError("Ungültige Angabe – bitte die Seite neu laden.");
  return parsed.data;
}

async function applicationFrom(form: FormData) {
  const app = (await db().from("applications").select("*").eq("id", idFrom(form)).maybeSingle()).data as Application | null;
  if (!app) throw new AdminError("Profil nicht gefunden.");
  return app;
}

/** „35“, „35,50“ oder „20.5“ → Cent */
function centsFrom(form: FormData, key: string) {
  const raw = String(form.get(key) ?? "").replace(/[€\s]/g, "").replace(",", ".");
  const value = Number(raw);
  if (!raw || !Number.isFinite(value)) throw new AdminError("Bitte einen Betrag in Euro angeben, z. B. 35 oder 20,50.");
  return Math.round(value * 100);
}

// ---------------------------------------------------------------------------
// Anmelden
// ---------------------------------------------------------------------------

const MAX_FAILED_LOGINS = 8;

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  if (passwordStatus() !== "ok") return { error: "Der Adminbereich ist noch nicht eingerichtet." };

  // Fehlversuche je Anschluss zählen (nur ein Kürzel, nicht die IP-Adresse selbst)
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unbekannt";
  const who = createHmac("sha256", `tisch6-login:${process.env.ADMIN_PASSWORD}`).update(ip).digest("hex").slice(0, 16);
  let client: ReturnType<typeof db> | null = null;
  try {
    client = db();
    const { count } = await client
      .from("admin_log")
      .select("id", { count: "exact", head: true })
      .eq("action", "Anmeldung fehlgeschlagen")
      .eq("detail", who)
      .gte("created_at", new Date(Date.now() - 15 * 60_000).toISOString());
    if ((count ?? 0) >= MAX_FAILED_LOGINS) return { error: "Zu viele Versuche. Bitte in 15 Minuten nochmal." };
  } catch (e) {
    console.error("Anmeldung: Protokoll nicht erreichbar", e);
  }

  if (!checkPassword(String(form.get("password") ?? ""))) {
    if (client) await logAdmin(client, "Anmeldung fehlgeschlagen", { detail: who });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: "Das Passwort stimmt nicht." };
  }

  const { value, expires } = createSessionToken();
  (await cookies()).set(sessionCookie.name, value, { ...sessionCookie.options, expires });
  if (client) await logAdmin(client, "Anmeldung");
  redirect(safeAdminPath(form.get("weiter")));
}

export async function logout() {
  (await cookies()).set(sessionCookie.name, "", { ...sessionCookie.options, maxAge: 0 });
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Übersicht
// ---------------------------------------------------------------------------

export async function tickAction(): Promise<ActionResult> {
  return run(async () => {
    const client = db();
    const report = await runTick(client);
    if (report.skipped) throw new AdminError(report.skipped);
    await logAdmin(client, "Durchlauf von Hand gestartet");
    return describeTick(report);
  });
}

export async function planTablesAction(): Promise<ActionResult> {
  return run(async () => {
    const client = db();
    const report = await runTick(client, { matching: "force" });
    if (report.skipped) throw new AdminError(report.skipped);
    await logAdmin(client, "Tischplanung von Hand gestartet");
    return describeTick(report);
  });
}

export async function testSendAction(_: ActionResult, form: FormData) {
  return run(async () => sendTestMessages(db(), String(form.get("phone") ?? "")));
}

/** Leitet zur Stripe-Bezahlseite über 1 € weiter; Stripe schickt danach zurück in die Übersicht */
export async function testPaymentAction(): Promise<ActionResult> {
  await requireAdmin();
  let url: string;
  try {
    url = await startTestPayment(db());
  } catch (e) {
    return failure(e);
  }
  // redirect() bricht mit einem eigenen Fehler ab – deshalb außerhalb von try
  redirect(url);
}

export async function learningsAction(): Promise<ActionResult> {
  return run(async () => {
    if (!(await updateLearnings(db(), true))) throw new AdminError("Es gibt noch kein Feedback, aus dem die KI lernen könnte.");
    return "Neue Lernnotizen erstellt – sie fließen ab sofort ins Matching ein.";
  });
}

// ---------------------------------------------------------------------------
// Bewerbungen und Profile
// ---------------------------------------------------------------------------

export async function acceptAction(_: ActionResult, form: FormData) {
  return run(async () => acceptApplicant(db(), await applicationFrom(form)));
}

export async function rejectAction(_: ActionResult, form: FormData) {
  return run(async () => rejectApplicant(db(), await applicationFrom(form)));
}

export async function waitlistAction(_: ActionResult, form: FormData) {
  return run(async () => {
    const reason = String(form.get("reason") ?? "");
    if (!(reason in WAITLIST_REASONS)) throw new AdminError("Bitte einen Grund wählen.");
    return waitlistApplicant(db(), await applicationFrom(form), reason as keyof typeof WAITLIST_REASONS);
  });
}

export async function blockAction(_: ActionResult, form: FormData) {
  return run(async () => blockApplicant(db(), await applicationFrom(form), form.get("notify") === "on"));
}

export async function unblockAction(_: ActionResult, form: FormData) {
  return run(async () => unblockApplicant(db(), await applicationFrom(form)));
}

export async function clearReviewAction(_: ActionResult, form: FormData) {
  return run(async () => clearReview(db(), await applicationFrom(form)));
}

export async function availabilityAction(_: ActionResult, form: FormData) {
  return run(async () => setApplicantAvailability(db(), await applicationFrom(form), form.get("available") === "1"));
}

export async function stopCampaignsAction(_: ActionResult, form: FormData) {
  return run(async () => stopCampaigns(db(), await applicationFrom(form)));
}

export async function noteAction(_: ActionResult, form: FormData) {
  return run(async () => saveNote(db(), await applicationFrom(form), String(form.get("note") ?? "")));
}

export async function creditAction(_: ActionResult, form: FormData) {
  return run(async () => grantCredit(db(), await applicationFrom(form), Number(form.get("seats"))));
}

export async function discountAction(_: ActionResult, form: FormData) {
  return run(async () => grantDiscount(db(), await applicationFrom(form), centsFrom(form, "price")));
}

export async function deleteAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteApplicant(db(), await applicationFrom(form));
  } catch (e) {
    return failure(e);
  }
  redirect("/admin/bewerbungen?geloescht=1");
}

// ---------------------------------------------------------------------------
// Dinner und Plätze
// ---------------------------------------------------------------------------

export async function cancelDinnerAction(_: ActionResult, form: FormData) {
  return run(async () => cancelDinner(db(), idFrom(form), form.get("money") === "refund" ? "refund" : "credit"));
}

export async function moveDinnerAction(_: ActionResult, form: FormData) {
  return run(async () => moveDinner(db(), idFrom(form), String(form.get("when") ?? ""), idFrom(form, "restaurant")));
}

export async function cardAction(_: ActionResult, form: FormData) {
  return run(async () => {
    const client = db();
    const { dinner } = await loadDinner(client, idFrom(form));
    if (form.get("renew") === "1") {
      await client.from("dinners").update({ conversation_card: null }).eq("id", dinner.id);
      dinner.conversation_card = null;
    }
    await ensureConversationCard(client, dinner);
    await logAdmin(client, "Gesprächskarte erstellt", { dinnerId: dinner.id });
    return "Die Gesprächskarte ist fertig.";
  });
}

export async function replaceNowAction(_: ActionResult, form: FormData) {
  return run(async () => replaceNow(db(), idFrom(form)));
}

export async function inviteAction(_: ActionResult, form: FormData) {
  return run(async () => inviteToDinner(db(), idFrom(form), idFrom(form, "person")));
}

export async function resendReservationAction(_: ActionResult, form: FormData) {
  return run(async () => resendReservation(db(), idFrom(form)));
}

export async function removeSeatAction(_: ActionResult, form: FormData) {
  return run(async () => removeSeat(db(), idFrom(form), { refund: form.get("refund") === "on", replace: form.get("replace") === "on" }));
}

export async function extendInviteAction(_: ActionResult, form: FormData) {
  return run(async () => extendInvite(db(), idFrom(form), 24));
}

export async function confirmManuallyAction(_: ActionResult, form: FormData) {
  return run(async () => confirmManually(db(), idFrom(form), centsFrom(form, "price")));
}

export async function noShowAction(_: ActionResult, form: FormData) {
  return run(async () => markNoShow(db(), idFrom(form)));
}

export async function revertNoShowAction(_: ActionResult, form: FormData) {
  return run(async () => revertNoShow(db(), idFrom(form)));
}

// ---------------------------------------------------------------------------
// Zahlungen, Meldungen, Lokale
// ---------------------------------------------------------------------------

export async function refundAction(_: ActionResult, form: FormData) {
  return run(async () => refundPayment(db(), idFrom(form)));
}

export async function reportAction(_: ActionResult, form: FormData) {
  return run(async () => {
    const decision = form.get("decision") === "blocked" ? "blocked" : "dismissed";
    return resolveReport(db(), idFrom(form), decision, String(form.get("note") ?? ""));
  });
}

export async function restaurantAction(_: ActionResult, form: FormData) {
  return run(async () => {
    const id = form.get("id") ? idFrom(form) : null;
    return saveRestaurant(db(), id, restaurantFromForm(form));
  });
}

export async function deleteRestaurantAction(_: ActionResult, form: FormData) {
  return run(async () => deleteRestaurant(db(), idFrom(form)));
}
