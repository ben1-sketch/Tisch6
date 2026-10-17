# Tisch6

KI-kuratierte Dating-Dinner für Singles – sechs Menschen, ein Tisch. Pilot in Wien.
**Kein Wischen, kein Ghosting, echte Menschen am Tisch.**

## Stand

| Etappe | Inhalt | Status |
|---|---|---|
| 1 | Öffentliche Website, Bewerbung (auch zu zweit), SMS-Verifizierung, KI-Onboarding, Rechtstexte, Profil löschen | ✅ |
| 2 | Bewertung, E-Mails & SMS, Matching & Tische, Nachrücker, Stripe, Eisbrecher-Karte, Wiedersehen & Feedback | offen |
| 3 | Adminbereich | offen |

Einrichtung: **[docs/SETUP-ETAPPE-1.md](docs/SETUP-ETAPPE-1.md)**

## Technik

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4) – Hosting auf Vercel
- **Supabase** (EU/Frankfurt) – Datenbank, Login per Handynummer (SMS-Code)
- **Claude API** – Kennenlern-Chat und Profil-Auswertung (`src/lib/onboarding.ts`)
- Mehrsprachig vorbereitet: Texte in `src/i18n/dictionaries/`, URLs mit Sprachpräfix (`/de/...`)

## Struktur

```
src/app/[lang]/            Seiten (Start, bewerben, konto, impressum, datenschutz, agb)
src/app/api/onboarding/    Bewerbung anlegen, Chat-Nachrichten
src/app/api/account/       Profil endgültig löschen (DSGVO)
src/components/            Header, Footer, Logo, ApplyFlow (Bewerbung + Chat), Account
src/lib/onboarding.ts      Interview-Prompt, Antwort- und Profil-Schema
src/proxy.ts               Sprach-Weiterleitung + Supabase-Session
supabase/migrations/       Datenbankschema
```

## Lokal starten

```bash
cp .env.example .env.local   # Werte eintragen
npm install
npm run dev                  # http://localhost:3000
```

Ohne Supabase-Werte läuft die Website, die Bewerbung zeigt dann einen Hinweis statt des Formularversands.
