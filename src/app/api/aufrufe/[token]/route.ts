import { NextResponse } from "next/server";
import { stopCampaignsFor, verifyOptOutToken } from "@/lib/campaigns";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Ein-Klick-Abbestellen der Aufrufe aus der E-Mail – Einladungen zu Tischen bleiben */
export async function POST(_request: Request, ctx: RouteContext<"/api/aufrufe/[token]">) {
  const { token } = await ctx.params;
  const applicationId = verifyOptOutToken(token);
  if (!applicationId) return NextResponse.json({ error: "Link ungültig" }, { status: 404 });
  const client = db();
  const app = (await client.from("applications").select("first_name").eq("id", applicationId).maybeSingle()).data as {
    first_name: string;
  } | null;
  if (!app) return NextResponse.json({ error: "Link ungültig" }, { status: 404 });
  await stopCampaignsFor(client, applicationId, "selbst abbestellt über den Link in der E-Mail");
  return NextResponse.json({ ok: true, firstName: app.first_name });
}
