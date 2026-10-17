# Etappe 1 – Einmalige Einrichtung

Diese Schritte machst du **einmal**. Danach läuft tisch6.at automatisch bei jedem Push auf GitHub neu.
Reihenfolge einhalten – jeder Schritt liefert Werte, die der nächste braucht. Dauer: ca. 45 Minuten.

---

## 1. Supabase (Datenbank + SMS-Login) – kostenlos

1. Auf **supabase.com** registrieren → **New project**.
   - Name: `tisch6`
   - Region: **Central EU (Frankfurt)** ← wichtig für die DSGVO
   - Datenbank-Passwort generieren und sicher aufbewahren.
2. Links **SQL Editor** → **New query** → nacheinander den kompletten Inhalt dieser Dateien einfügen und jeweils **Run** klicken:
   1. `supabase/migrations/0001_etappe1_bewerbungen.sql`
   2. `supabase/migrations/0002_bring_eine_freundin_mit.sql`
3. Links **Project Settings → API** (bzw. „API Keys“) und drei Werte notieren:
   - `Project URL` → wird `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` key → wird `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / `secret` key → wird `SUPABASE_SERVICE_ROLE_KEY` (**geheim halten!**)
4. **Authentication → Sign In / Providers → Phone** aktivieren und den SMS-Dienst eintragen (siehe Schritt 2).
5. **Authentication → URL Configuration**: Site URL = `https://tisch6.at`.

## 2. SMS-Dienst (Verifizierung, später auch Erinnerungen)

SMS sind der einzige Baustein, den es nicht dauerhaft gratis gibt – jede SMS kostet beim Netzbetreiber Geld.
Empfehlung: **Twilio** (wird von Supabase direkt unterstützt und in Etappe 2 auch für Erinnerungen und Nachrücker verwendet).

1. Auf **twilio.com** registrieren. Du bekommst ein Testguthaben (ca. 15 $).
   - Achtung: Im Testmodus schickt Twilio SMS nur an Nummern, die du vorher bei Twilio bestätigt hast.
     Für echte Bewerberinnen und Bewerber musst du das Konto upgraden (Kreditkarte hinterlegen, kein Monatsfixum).
   - Kosten: ca. 0,08 € pro SMS nach Österreich. Eine Bewerbung = 1 SMS, später pro Dinner ca. 3 Erinnerungen.
2. In Twilio: **Messaging → Services → Create Messaging Service**, als Absender einen alphanumerischen Namen `Tisch6`
   eintragen (funktioniert in Österreich ohne eigene Nummer).
3. **Account SID**, **Auth Token** und die **Messaging Service SID** kopieren.
4. In Supabase → **Authentication → Sign In / Providers → Phone** → SMS provider **Twilio** → die drei Werte eintragen → Speichern.
5. **Gratis testen ohne SMS:** im selben Fenster unter „Test phone numbers and OTPs“ z. B. `436601234567=123456` eintragen.
   Mit dieser Nummer und dem Code `123456` spielst du den ganzen Ablauf ohne SMS-Kosten durch.

## 3. Claude-API (KI-Onboarding)

1. Auf **console.anthropic.com** registrieren → **Settings → Billing**: Guthaben aufladen (z. B. 10 $) und
   unter **Limits** ein Monatslimit setzen, damit nichts ausufert.
2. **API Keys → Create Key** → Name `tisch6` → Schlüssel kopieren → wird `ANTHROPIC_API_KEY`.
3. Kosten-Richtwert: ein komplettes Bewerbungsgespräch kostet mit dem Standardmodell grob einige Cent.
   Wer noch sparen will, setzt in Vercel zusätzlich `ANTHROPIC_MODEL=claude-haiku-5-5` (deutlich billiger, etwas weniger feinfühlig).

## 4. Vercel (Hosting) – kostenlos (Hobby-Tarif)

1. Auf **vercel.com** mit dem GitHub-Account anmelden.
2. **Add New → Project** → Repository `ben1-sketch/Tisch6` importieren.
   - Falls die Arbeit noch auf dem Branch `claude/tisch6-komplett-aufbauen-pvhhx4` liegt: zuerst auf GitHub
     den Pull Request nach `main` mergen (oder unter Settings → Git den Production Branch anpassen).
3. Vor dem ersten Deploy unter **Environment Variables** eintragen:

   | Name | Wert |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | aus Schritt 1.3 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | aus Schritt 1.3 |
   | `SUPABASE_SERVICE_ROLE_KEY` | aus Schritt 1.3 |
   | `ANTHROPIC_API_KEY` | aus Schritt 3.2 |
   | `NEXT_PUBLIC_SITE_URL` | `https://tisch6.at` |

4. **Deploy** klicken. Nach ca. 1–2 Minuten ist die Seite unter `tisch6-xxx.vercel.app` erreichbar.
5. **Settings → Functions**: Region **Frankfurt (fra1)** wählen (kürzere Wege zur EU-Datenbank).

## 5. GoDaddy (Domain tisch6.at auf Vercel zeigen lassen)

1. In Vercel: Projekt → **Settings → Domains** → `tisch6.at` hinzufügen, danach auch `www.tisch6.at`
   (Vercel schlägt vor, `www` auf `tisch6.at` umzuleiten – annehmen).
2. Vercel zeigt dir die nötigen DNS-Einträge an. Typisch sind:
   - `A`-Record, Name `@`, Wert `76.76.21.21`
   - `CNAME`-Record, Name `www`, Wert `cname.vercel-dns.com`
   (Immer die Werte nehmen, die Vercel **dir** anzeigt – die können abweichen.)
3. Bei **GoDaddy**: Meine Produkte → tisch6.at → **DNS** → **DNS-Einträge verwalten**.
   - Vorhandenen `A`-Record mit Name `@` (meist „Parked“) **bearbeiten** und auf die Vercel-IP setzen.
   - Vorhandenen `CNAME` `www` bearbeiten (oder neu anlegen) mit dem Vercel-Wert.
   - Eventuelle Weiterleitungen („Forwarding“) bei GoDaddy deaktivieren.
4. Warten (meist 10–60 Minuten). In Vercel springt der Status auf „Valid Configuration“, das SSL-Zertifikat kommt automatisch.

## 6. Vor dem Livegang ausfüllen

Auf den Seiten **Impressum**, **Datenschutz** und **AGB** sind alle offenen Angaben rosa markiert
(Name, Adresse, E-Mail, UID, Gewerbe). Diese Texte stehen in
`src/app/[lang]/impressum|datenschutz|agb/page.tsx`. Die AGB sind ein Entwurf – bitte juristisch prüfen lassen
(z. B. über die WKO-Gründerberatung, oft kostenlos).

## 7. Testen

1. `https://tisch6.at/de/bewerben` öffnen.
2. Formular ausfüllen → Test-Handynummer aus 2.5 → Code `123456`.
3. Mit der KI-Gastgeberin chatten bis zum Ende.
4. In Supabase → **Table Editor → applications**: Die Bewerbung steht mit `status = submitted`,
   dem Chat-Verlauf (`transcript`) und dem ausgewerteten `profile`.
5. Am Ende erscheint dein Einladungslink („Bring eine Freundin mit“). In einem privaten Browserfenster öffnen und
   mit einer zweiten Testnummer bewerben → in `applications` sind beide Einträge über `buddy_id` verknüpft.
6. Unter `/de/konto` den Status ansehen und die Löschfunktion testen.

---

**Was Etappe 1 noch nicht macht** (kommt in Etappe 2): automatische Bewertung (angenommen/Warteliste, inkl. Steuerung
des Geschlechterverhältnisses), E-Mails über Resend, Matching und Tische, Stripe-Zahlung inkl. Gründungspaket,
Nachrücker, Eisbrecher-Karte, Erinnerungen per E-Mail und SMS, Wiedersehen-Abfrage, Feedback und Folgeeinladungen.
Resend und Stripe brauchst du deshalb erst in Etappe 2 einzurichten.
