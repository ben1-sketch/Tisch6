import { NextResponse } from "next/server";
import { type Application, db } from "@/lib/db";
import { setAvailability } from "@/lib/dinners";

export const dynamic = "force-dynamic";

/** Ein-Klick-Zusage „Ich bin wieder dabei“ aus der Folgeeinladung */
export async function POST(_request: Request, ctx: RouteContext<"/api/rejoin/[token]">) {
  const { token } = await ctx.params;
  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.json({ error: "Link ungültig" }, { status: 404 });
  const client = db();
  const app = (await client.from("applications").select("*").eq("magic_token", token).maybeSingle()).data as Application | null;
  if (!app) return NextResponse.json({ error: "Link ungültig" }, { status: 404 });
  const ok = await setAvailability(client, app, true);
  if (!ok) return NextResponse.json({ error: "Dein Profil ist gerade nicht aktiv." }, { status: 409 });
  return NextResponse.json({ ok: true, firstName: app.first_name });
}
