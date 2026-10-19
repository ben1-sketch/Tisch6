/** "0660 123 45 67" → "+436601234567" (österreichische Nummern ohne Vorwahl); Unbrauchbares → null */
export function normalizePhone(raw: string) {
  let p = raw.replace(/[\s\-/()]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  else if (p.startsWith("0")) p = `+43${p.slice(1)}`;
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}
