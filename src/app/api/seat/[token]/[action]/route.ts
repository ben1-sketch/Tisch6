import { NextResponse } from "next/server";
import { z } from "zod";
import { TABLE, TIMING } from "@/lib/config";
import { db } from "@/lib/db";
import { reportPerson, saveFeedback } from "@/lib/dinners";
import { PaymentError, createCheckout, redeemCredit } from "@/lib/payments";
import { cancelSeat, declineSeat, loadApplication, loadDinner } from "@/lib/seats";
import { seatUrl } from "@/lib/messages";
import { DAY, HOUR } from "@/lib/time";
import { seatByToken } from "@/lib/views";

export const dynamic = "force-dynamic";

const FeedbackSchema = z.object({
  ratingEvening: z.number().int().min(1).max(5).nullable(),
  ratingTable: z.number().int().min(1).max(5).nullable(),
  improve: z.string().max(1000).default(""),
  wantsToSee: z.array(z.uuid()).max(TABLE.size).default([]),
  absent: z.array(z.uuid()).max(TABLE.size).default([]),
  sharePhone: z.boolean().default(true),
  quote: z.string().max(300).default(""),
  quoteOk: z.boolean().default(false),
});
const ReportSchema = z.object({ reportedId: z.uuid(), reason: z.string().max(2000).default("") });

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Aktionen auf der Einladungsseite – der Link aus der E-Mail ist der Schlüssel. */
export async function POST(request: Request, ctx: RouteContext<"/api/seat/[token]/[action]">) {
  const { token, action } = await ctx.params;
  const client = db();
  const seat = await seatByToken(client, token);
  if (!seat) return fail("Einladung nicht gefunden.", 404);
  const app = await loadApplication(client, seat.application_id);
  const { dinner } = await loadDinner(client, seat.dinner_id);
  const start = new Date(dinner.starts_at).getTime();
  const now = Date.now();
  const body = await request.json().catch(() => ({}));
  const openInvite =
    (seat.status === "invited" || seat.status === "offered") && (!seat.expires_at || new Date(seat.expires_at).getTime() > now);
  const closed = () => fail("Diese Einladung ist nicht mehr offen.", 409);

  try {
    switch (action) {
      case "checkout": {
        if (!openInvite) return closed();
        if (app.status !== "accepted") return fail("Dein Profil ist gerade nicht aktiv.", 409);
        const url = await createCheckout(client, seat, app, body?.package === true);
        return NextResponse.json({ url });
      }
      case "credit": {
        if (!openInvite) return closed();
        await redeemCredit(client, seat, app);
        return NextResponse.json({ ok: true });
      }
      case "gesehen": {
        // Einladung im Browser geöffnet (SeatSeen) – zählt als Reaktion, dann keine letzte Erinnerung per SMS
        if (openInvite && !seat.viewed_at) {
          await client.from("seats").update({ viewed_at: new Date().toISOString() }).eq("id", seat.id).is("viewed_at", null);
        }
        return NextResponse.json({ ok: true });
      }
      case "decline": {
        return (await declineSeat(client, seat)) ? NextResponse.json({ ok: true }) : closed();
      }
      case "cancel": {
        if (seat.status !== "confirmed" || now >= start) return fail("Eine Absage ist hier nicht mehr möglich.", 409);
        const result = await cancelSeat(client, seat);
        return result ? NextResponse.json({ ok: true, late: result.late }) : fail("Eine Absage ist hier nicht mehr möglich.", 409);
      }
      case "report": {
        const parsed = ReportSchema.safeParse(body);
        if (!parsed.success) return fail("Bitte wähle eine Person aus.");
        const inWindow = now >= start - TIMING.reportFromHoursBefore * HOUR && now <= start + TIMING.reportUntilDaysAfter * DAY;
        if (!["confirmed", "attended", "no_show"].includes(seat.status) || !inWindow) return fail("Melden ist gerade nicht möglich.", 409);
        const ok = await reportPerson(client, seat, parsed.data.reportedId, parsed.data.reason);
        return ok ? NextResponse.json({ ok: true }) : fail("Bitte wähle eine Person von deinem Tisch aus.");
      }
      case "feedback": {
        if (seat.status !== "attended" || now > start + TIMING.reportUntilDaysAfter * DAY) {
          return fail("Das Feedback für diesen Abend ist geschlossen.", 409);
        }
        const parsed = FeedbackSchema.safeParse(body);
        if (!parsed.success) return fail("Bitte prüfe deine Angaben.");
        await saveFeedback(client, seat, parsed.data);
        return NextResponse.json({ ok: true });
      }
      default:
        return fail("Unbekannte Aktion.", 404);
    }
  } catch (e) {
    if (e instanceof PaymentError) return fail(e.message, 409);
    console.error(`Platz-Aktion ${action}`, e);
    return fail("Da ist etwas schiefgelaufen. Bitte versuch es gleich nochmal.", 500);
  }
}

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Kalenderdatei (.ics) für einen zugesagten Platz */
export async function GET(_request: Request, ctx: RouteContext<"/api/seat/[token]/[action]">) {
  const { token, action } = await ctx.params;
  if (action !== "ics") return fail("Nicht gefunden.", 404);
  const client = db();
  const seat = await seatByToken(client, token);
  if (!seat || !["confirmed", "attended"].includes(seat.status)) return fail("Nicht gefunden.", 404);
  const { dinner, restaurant } = await loadDinner(client, seat.dinner_id);
  const start = new Date(dinner.starts_at);
  const end = new Date(start.getTime() + TABLE.durationHours * HOUR);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tisch6//Dinner//DE",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${seat.id}@tisch6.at`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText("Tisch6 – Dinner")}`,
    `LOCATION:${icsText(`${restaurant.name}, ${restaurant.address}`)}`,
    `DESCRIPTION:${icsText(`Deine Einladung: ${seatUrl(seat.token)}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="tisch6-dinner.ics"' },
  });
}
