import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { appManifest } from "@/lib/manifest";
import { sendPush } from "@/lib/notify";
import { removePushDevice, savePushDevice } from "@/lib/push";
import { appOwner } from "@/lib/views";

export const dynamic = "force-dynamic";

/** Push-Dienste der Browser (Apple, Google, Mozilla, Microsoft) – an andere Adressen schickt der Server nichts. */
const PUSH_HOSTS = ["web.push.apple.com", "fcm.googleapis.com", "android.googleapis.com", "push.services.mozilla.com", "notify.windows.com"];

const pushEndpoint = z
  .string()
  .max(1000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    } catch {
      return false;
    }
  });
const SubscribeSchema = z.object({
  endpoint: pushEndpoint,
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
const UnsubscribeSchema = z.object({ endpoint: z.string().max(1000) });

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Persönliches Manifest: Die installierte App startet direkt auf der eigenen App-Seite. */
export async function GET(_request: Request, ctx: RouteContext<"/api/app/[token]/[action]">) {
  const { token, action } = await ctx.params;
  if (action !== "manifest" || !(await appOwner(db(), token))) return fail("Nicht gefunden.", 404);
  return new NextResponse(JSON.stringify(appManifest(`/de/app/${token}`, "/de/app")), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "private, no-store" },
  });
}

/** Benachrichtigungen ein- und ausschalten, Probe-Nachricht – der persönliche App-Link ist der Schlüssel. */
export async function POST(request: Request, ctx: RouteContext<"/api/app/[token]/[action]">) {
  const { token, action } = await ctx.params;
  const client = db();
  const owner = await appOwner(client, token);
  if (!owner) return fail("Nicht gefunden.", 404);
  const body = await request.json().catch(() => ({}));

  switch (action) {
    case "einschalten": {
      const parsed = SubscribeSchema.safeParse(body);
      if (!parsed.success) return fail("Dieses Gerät kann leider keine Benachrichtigungen von Tisch6 empfangen.");
      await savePushDevice(client, owner.id, parsed.data, request.headers.get("user-agent"));
      return NextResponse.json({ ok: true });
    }
    case "ausschalten": {
      const parsed = UnsubscribeSchema.safeParse(body);
      if (!parsed.success) return fail("Ungültige Anfrage.");
      await removePushDevice(client, parsed.data.endpoint, { applicationId: owner.id });
      return NextResponse.json({ ok: true });
    }
    case "probe": {
      // höchstens eine Probe pro Minute
      const result = await sendPush(client, {
        applicationId: owner.id,
        title: "Tisch6",
        body: `Hallo ${owner.firstName}, so kommen Nachrichten von Tisch6 bei dir an. 🥂`,
        url: `/de/app/${token}`,
        kind: "push_test",
        dedupeKey: `push_test:${owner.id ?? "team"}:${Math.floor(Date.now() / 60_000)}`,
      });
      if (result === "sent") return NextResponse.json({ ok: true });
      if (result === "duplicate") return fail("Gerade erst geschickt – probier es in einer Minute noch einmal.", 429);
      return fail("Die Probe-Nachricht ist nicht angekommen. Schalte die Benachrichtigungen aus und wieder ein.", 502);
    }
    default:
      return fail("Nicht gefunden.", 404);
  }
}
