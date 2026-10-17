import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { PHOTO_BUCKET, decryptPhoto } from "@/lib/photo";

export const dynamic = "force-dynamic";

/** Verifizierungsfoto – nur für das Team, wird erst hier entschlüsselt und nie zwischengespeichert. */
export async function GET(_: Request, ctx: RouteContext<"/admin/foto/[id]">) {
  if (!(await isAdmin())) return new Response("nicht angemeldet", { status: 401 });
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });

  const client = db();
  const { data: app } = await client.from("applications").select("photo_path").eq("id", id).maybeSingle();
  if (!app?.photo_path) return new Response(null, { status: 404 });
  const { data: blob, error } = await client.storage.from(PHOTO_BUCKET).download(app.photo_path);
  if (error || !blob) return new Response(null, { status: 404 });

  try {
    const jpeg = decryptPhoto(Buffer.from(await blob.arrayBuffer()));
    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (e) {
    console.error("Foto entschlüsseln fehlgeschlagen:", e);
    return new Response("Foto nicht lesbar – stimmt PHOTO_ENCRYPTION_KEY?", { status: 500 });
  }
}
