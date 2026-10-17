# Tisch6

KI-kuratierte Dating-Dinner für Singles – sechs Menschen, ein Tisch. Pilot in Wien.
**Kein Wischen, kein Ghosting, echte Menschen am Tisch.**

## Stand

| Etappe | Inhalt | Status |
|---|---|---|
| 1 | Öffentliche Website, Bewerbung (auch zu zweit), SMS- & Foto-Verifizierung, KI-Onboarding, Einladungslink, Rechtstexte, Profil löschen | ✅ |
| 2 | Bewertung, E-Mails & SMS, KI-Matching, Terminfestlegung, Nachrücker, Stripe & Gründungspaket, Erinnerungen, Eisbrecher-Karte, Meldeknopf, Wiedersehen & Feedback, Rabatte, Folgeeinladungen | ✅ |
| 3 | Adminbereich | offen |

Einrichtung: **[Etappe 1](docs/SETUP-ETAPPE-1.md)** · **[Etappe 2](docs/SETUP-ETAPPE-2.md)**

## Technik

- **Next.js 16** (App Router, TypeScript, Tailwind CSS 4) – Hosting auf Vercel
- **Supabase** (EU/Frankfurt) – Datenbank, Login per Handynummer (SMS-Code)
- **Claude API** – Kennenlern-Chat, Profil-Auswertung, Bewertung, Tischwahl, Eisbrecher-Karten, Lernnotizen
- **Stripe** – Zahlungen (Checkout + Webhook), **Resend** – E-Mails, **Twilio** – SMS
- **Automatischer Durchlauf** alle 10 Minuten (`/api/cron/tick`, ausgelöst von Supabase pg_cron)
- Mehrsprachig vorbereitet: Texte in `src/i18n/dictionaries/`, URLs mit Sprachpräfix (`/de/...`)

## Struktur

```
src/app/[lang]/            Seiten (Start, bewerben, konto, einladung, wiedersehen, weiter, Rechtstexte)
src/app/api/onboarding/    Bewerbung anlegen, Chat-Nachrichten
src/app/api/photo/         Verifizierungsfoto (AES-256-verschlüsselt, privat)
src/app/api/account/       Konto-Überblick, Verfügbarkeit, Profil endgültig löschen (DSGVO)
src/app/api/cron/tick/     Automatischer Durchlauf (Bewertung, Matching, Fristen, Erinnerungen, Abschluss)
src/app/api/seat/…         Einladung: bezahlen, Paket, absagen, melden, Feedback, Kalender
src/app/api/stripe/webhook Zahlungen verbuchen
src/components/            Header, Footer, Logo, ApplyFlow (Bewerbung + Chat), Account
src/lib/config.ts          Alle Spielregeln: Preise, Fristen, Tischregeln
src/lib/onboarding.ts      Interview-Prompt, Antwort- und Profil-Schema
src/lib/evaluation.ts      Bewertung der Bewerbungen, Warteliste, Geschlechterverhältnis
src/lib/matching*.ts       Tischregeln, Kandidatenrunden, KI-Wahl, Terminfindung
src/lib/seats.ts           Einladen, Zusagen, Absagen, Nachrücker, Entscheidung 72 h vorher
src/lib/dinners.ts         Erinnerungen, Eisbrecher, Wiedersehen, Abschluss, Lebenszeichen, Lernen
src/lib/messages.ts        Alle E-Mail- und SMS-Texte
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
