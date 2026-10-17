import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const PHOTO_BUCKET = "verification-photos";
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

/**
 * Schlüssel aus PHOTO_ENCRYPTION_KEY (beliebige lange Passphrase, mind. 32 Zeichen).
 * Geht der Schlüssel verloren, sind die gespeicherten Fotos nicht mehr lesbar.
 */
function key() {
  const secret = process.env.PHOTO_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("PHOTO_ENCRYPTION_KEY fehlt oder ist kürzer als 32 Zeichen");
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Format: 12 Byte IV | 16 Byte Auth-Tag | verschlüsselte Daten. */
export function encryptPhoto(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}

/** Gegenstück für den Adminbereich (Etappe 3). */
export function decryptPhoto(blob: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key(), blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]);
}

/** Akzeptiert nur echte JPEGs (der Browser rechnet jedes Foto vorher in JPEG um). */
export function isJpeg(data: Buffer) {
  return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}
