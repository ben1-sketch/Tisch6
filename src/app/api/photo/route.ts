import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_PHOTO_BYTES, PHOTO_BUCKET, encryptPhoto, isJpeg } from "@/lib/photo";

export const dynamic = "force-dynamic";

/** Nimmt das eine Pflichtfoto entgegen, verschlüsselt es und legt es privat ab. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "nicht angemeldet" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof Blob) || file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Bitte ein Foto unter 3 MB hochladen." }, { status: 400 });
  }
  const data = Buffer.from(await file.arrayBuffer());
  if (!isJpeg(data)) return NextResponse.json({ error: "Das Foto konnte nicht gelesen werden." }, { status: 400 });

  const admin = createAdminClient();
  const { data: app } = await admin.from("applications").select("id").eq("id", user.id).maybeSingle();
  if (!app) return NextResponse.json({ error: "keine Bewerbung gefunden" }, { status: 404 });

  // Genau ein Foto pro Person: ein neuer Upload ersetzt das alte
  const path = `${user.id}.jpg.enc`;
  try {
    const { error } = await admin.storage
      .from(PHOTO_BUCKET)
      .upload(path, encryptPhoto(data), { contentType: "application/octet-stream", upsert: true });
    if (error) throw error;
  } catch (e) {
    // Ursache (z. B. fehlender Foto-Schlüssel) steht in den Vercel-Logs
    console.error("Foto-Speicherung fehlgeschlagen:", e);
    return NextResponse.json({ error: "Dein Foto konnte gerade nicht gespeichert werden. Bitte versuch es gleich nochmal." }, { status: 500 });
  }

  const { error: dbError } = await admin.from("applications").update({ photo_path: path }).eq("id", user.id);
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
