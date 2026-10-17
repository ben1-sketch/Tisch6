import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTO_BUCKET } from "@/lib/photo";

export const dynamic = "force-dynamic";

/** DSGVO-Löschung: entfernt Foto, Bewerbung und Login endgültig. */
export async function DELETE() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "nicht angemeldet" }, { status: 401 });

  const admin = createAdminClient();
  const { data: app } = await admin.from("applications").select("photo_path").eq("id", user.id).maybeSingle();
  if (app?.photo_path) {
    const { error: photoError } = await admin.storage.from(PHOTO_BUCKET).remove([app.photo_path]);
    if (photoError) return NextResponse.json({ error: photoError.message }, { status: 500 });
  }
  const { error: appError } = await admin.from("applications").delete().eq("id", user.id);
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
