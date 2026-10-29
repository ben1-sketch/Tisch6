/**
 * Bekannte E-Mail-Anbieter. Steht nach dem @ fast genau einer davon („gmail.om“), schlägt das Formular die
 * richtige Adresse vor. Die Liste enthält auch ähnliche, aber echte Domains (z. B. hotmail.ch), damit sie
 * nicht „ausgebessert“ werden.
 */
const DOMAINS = [
  "gmail.com", "googlemail.com", "gmx.at", "gmx.net", "gmx.de", "gmx.ch", "hotmail.com", "hotmail.de", "hotmail.at", "hotmail.ch",
  "outlook.com", "outlook.at", "outlook.de", "live.at", "live.com", "live.de", "msn.com", "icloud.com", "me.com", "mac.com",
  "yahoo.com", "yahoo.de", "aon.at", "chello.at", "a1.net", "kabelplus.at", "magenta.at", "tele2.at", "utanet.at", "inode.at",
  "web.de", "t-online.de", "posteo.at", "posteo.de", "proton.me", "protonmail.com", "bluewin.ch",
];

/** Anzahl der Tipp-Schritte (einfügen, löschen, ersetzen) von a nach b */
function distance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

/** „marc@gmail.om“ → „marc@gmail.com“; null, wenn die Adresse unauffällig ist */
export function emailTypo(email: string): string | null {
  const value = email.trim();
  const at = value.lastIndexOf("@");
  if (at < 1) return null;
  const domain = value.slice(at + 1).toLowerCase();
  if (!domain.includes(".") || DOMAINS.includes(domain)) return null;
  // kurze Domains nur bei einem einzigen Tippfehler, sonst würde z. B. aus gmx.ch ein gmx.at
  const limit = domain.length < 8 ? 1 : 2;
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const known of DOMAINS) {
    const d = distance(domain, known);
    if (d < bestDistance) {
      best = known;
      bestDistance = d;
    }
  }
  return best && bestDistance <= limit ? `${value.slice(0, at)}@${best}` : null;
}
