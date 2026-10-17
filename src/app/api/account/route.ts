import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** DSGVO-Löschung: entfernt Login und Bewerbung (per Cascade) endgültig. */
export async function DELETE() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "nicht angemeldet" }, { status: 401 });

  const admin = createAdminClient();
  const { error: appError } = await admin.from("applications").delete().eq("id", user.id);
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
