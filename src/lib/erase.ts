import "server-only";
import type { Db } from "./db";
import { PHOTO_BUCKET } from "./photo";

/** Löscht Foto, Bewerbung (samt allem, was daran hängt) und Login endgültig. */
export async function eraseApplicant(db: Db, id: string) {
  const { data: app } = await db.from("applications").select("photo_path").eq("id", id).maybeSingle();
  if (app?.photo_path) {
    const { error } = await db.storage.from(PHOTO_BUCKET).remove([app.photo_path]);
    if (error) throw new Error(`Foto löschen: ${error.message}`);
  }
  const { error: appError } = await db.from("applications").delete().eq("id", id);
  if (appError) throw new Error(`Bewerbung löschen: ${appError.message}`);
  const { error } = await db.auth.admin.deleteUser(id);
  if (error && error.status !== 404) throw new Error(`Login löschen: ${error.message}`);
}
