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
   3. `supabase/migrations/0003_foto_und_empfehlung.sql` (legt auch den privaten Fotospeicher `verification-photos` an)
   
   **Einfacher:** Statt der einzelnen Dateien einmal den Inhalt von `supabase/alles-in-einem.sql` einfügen und **Run** –
   das richtet die Datenbank für alle Etappen auf einmal ein. Am Ende steht „Fertig – die Datenbank ist komplett eingerichtet“.
3. Die Zugangsdaten überträgt am einfachsten die Supabase-Vercel-Integration (Schritt 4.5). Von Hand findest du sie
   unter **Project Settings → Data API** bzw. **API Keys**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (der ältere „anon“-Key geht auch)
   - Secret key (`sb_secret_…`) → `SUPABASE_SECRET_KEY` (**geheim halten!** – der ältere „service_role“-Key geht auch)
4. **Authentication → Sign In / Providers → Phone** aktivieren.
   - **Zum Testen ohne SMS:** unter „Test Phone Numbers and OTPs“ `436601234567=123456` eintragen.
     Mit der Handynummer `0660 1234567` und dem Code `123456` kommst du dann ohne echte SMS durch die Bewerbung.
   - Für echte Nummern braucht es einen SMS-Dienst (Schritt 2). Verlangt Supabase beim Speichern schon
     Anbieter-Daten und hast du Twilio noch nicht: **Twilio** wählen und vorerst Platzhalter eintragen –
     Account SID `AC00000000000000000000000000000000`, Auth Token `00000000000000000000000000000000`,
     Message Service SID `MG00000000000000000000000000000000`. An die Testnummer wird ohnehin keine SMS geschickt.
5. **Authentication → URL Configuration**: Site URL = `https://tisch6.at`.

## 2. SMS-Dienst (Verifizierung, später auch Erinnerungen)

SMS sind der einzige Baustein, den es nicht dauerhaft gratis gibt – jede SMS kostet beim Netzbetreiber Geld.
Empfehlung: **Twilio** (wird von Supabase direkt unterstützt und in Etappe 2 auch für Erinnerungen und Nachrücker verwendet).

1. Auf **twilio.com** registrieren. Du bekommst ein Testguthaben (ca. 15 $).
   - Achtung: Im Testmodus schickt Twilio SMS nur an Nummern, die du vorher bei Twilio bestätigt hast.
     Für echte Bewerberinnen und Bewerber musst du das Konto upgraden (Kreditkarte hinterlegen, kein Monatsfixum).
   - Kosten: ca. 0,08 € pro SMS nach Österreich. Eine Bewerbung = 1 SMS, später pro Dinner ca. 3 Erinnerungen.
   - Twilio verschickt erst SMS, wenn unter **Trust Hub → Profiles** ein *Primary profile* (Identitätsprüfung)
     den Status „Twilio Approved“ hat.
2. **Bewerbungs-Code über Twilio Verify:** Seit 1. Oktober 2026 blockieren österreichische Netze SMS von
   Absendernamen, die nicht bei der RTR registriert sind. Twilio Verify übernimmt diese Registrierung selbst:
   **Verify → Services → Create new** (Name `Tisch6`, Kanal SMS, Code length 6) und die **Service SID** (`VA…`) kopieren.
3. In Supabase → **Authentication → Sign In / Providers → Phone** → SMS provider **Twilio Verify** → Account SID (`AC…`),
   Auth Token und Verify Service SID (`VA…`) eintragen → Speichern. Kontrolle: Nach einem „Code senden“ steht der
   Versuch unter **Verify → Logs**.
4. **Erinnerungen, Notfall- und Nachrücker-SMS** schickt die Website selbst über einen Messaging Service:
   **Messaging → Services → Create Messaging Service** mit dem alphanumerischen Absender `Tisch6`. Account SID,
   Auth Token und Messaging Service SID (`MG…`) kommen in Vercel (Etappe 2, Schritt 5). Damit diese SMS in Österreich
   ankommen, muss `Tisch6` bei Twilio als Sender-ID registriert werden (Firmendaten, UID, Ausweis; bis zu 2 Wochen).
   Bis dahin gehen diese Nachrichten nur per E-Mail an.
5. Die Testnummer aus 1.4 kannst du behalten – für sie werden nie SMS verschickt.

## 3. Claude-API (KI-Onboarding)

1. Auf **console.anthropic.com** registrieren → **Settings → Billing**: Guthaben aufladen (z. B. 10 $) und
   unter **Limits** ein Monatslimit setzen, damit nichts ausufert.
2. **API Keys → Create Key** → Name `tisch6` → Schlüssel kopieren → wird `ANTHROPIC_API_KEY`.
3. Kosten-Richtwert: Ein komplettes Bewerbungsgespräch (ca. 20 Nachrichten plus Auswertung) kostet mit dem
   Standardmodell Claude Opus 5.5 grob 20–50 Cent. Mit `ANTHROPIC_MODEL=claude-haiku-5-5` (in Vercel zusätzlich
   eintragen) sind es weniger als 1 Cent – dafür ist das Gespräch etwas weniger feinfühlig. Für Tests reichen 5–10 $ Guthaben.

## 4. Vercel (Hosting) – kostenlos (Hobby-Tarif)

Hinweis: Den Hobby-Tarif erlaubt Vercel nur für nicht-kommerzielle Nutzung. Zum Testen passt er; spätestens wenn
echte Zahlungen laufen (Etappe 2), brauchst du den Pro-Tarif (ca. 20 $ im Monat).

1. Auf **vercel.com** mit dem GitHub-Account anmelden.
2. **Add New → Project** → Repository `ben1-sketch/Tisch6` importieren.
   Vercel veröffentlicht automatisch den Standard-Branch des Repos (derzeit `claude/tisch6-komplett-aufbauen-pvhhx4`).
   **Tipp:** Die Website selbst (Startseite, Rechtstexte) läuft schon ohne die Schlüssel aus Schritt 3 – so kannst du
   sie sofort am Handy anschauen. Nur die Bewerbung braucht Supabase und die Claude-API.
3. Vor dem ersten Deploy unter **Environment Variables** eintragen:

   | Name | Wert |
   |---|---|
   | `ANTHROPIC_API_KEY` | aus Schritt 3.2 |
   | `PHOTO_ENCRYPTION_KEY` | eine Passphrase mit mind. 32 Zeichen (siehe unten) |
   | `NEXT_PUBLIC_SITE_URL` | `https://tisch6.at` – erst eintragen, wenn die Domain verbunden ist (Schritt 5) |

   **Foto-Schlüssel:** Damit werden die Verifizierungsfotos verschlüsselt. Nimm einen langen Satz, den nur du kennst
   (mind. 32 Zeichen, gern mit Zahlen und Sonderzeichen), und speichere ihn in deiner Passwörter-App.
   **Ändere ihn nie** – ohne diesen Schlüssel sind die gespeicherten Fotos nicht mehr lesbar.

   **Tipp am Handy:** Vercel erkennt es, wenn du mehrere Zeilen `NAME=Wert` auf einmal in das erste Feld einfügst.

4. **Deploy** klicken. Nach ca. 1–2 Minuten ist die Seite unter `tisch6-xxx.vercel.app` erreichbar.
   Die Bewerbung meldet noch „nicht freigeschaltet“ – dafür fehlen die Supabase-Werte aus dem nächsten Schritt.
5. **Supabase mit Vercel verbinden** (überträgt die Supabase-Werte automatisch, nichts abschreiben):
   - In Supabase: **Project Settings → Integrations → Vercel** → verbinden, bei Vercel zustimmen und das
     Vercel-Projekt `tisch6` auswählen.
   - **Achtung:** Nicht in Vercel unter „Storage“ eine *neue* Supabase-Datenbank anlegen – das wäre ein zweites,
     leeres Projekt ohne unsere Tabellen.
   - Danach in Vercel unter **Settings → Environment Variables** prüfen, dass `NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` und `SUPABASE_SECRET_KEY` da sind (weitere Einträge wie `POSTGRES_…` stören nicht).
   - Findest du die Integration nicht: die drei Werte aus Schritt 1.3 von Hand unter **Environment Variables** eintragen.
6. Einmal neu bauen, damit die Website die neuen Werte übernimmt: **Deployments** → beim obersten Eintrag „⋯“ → **Redeploy**.
7. Die Server-Region Frankfurt (`fra1`, nah an der EU-Datenbank), das Framework (Next.js), Install- und Build-Befehl
   sowie die Node-Version sind über `vercel.json` und `package.json` fest eingestellt – in Vercel musst du dafür nichts ändern.

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

1. Deine Vercel-Adresse (z. B. `https://tisch6-xxx.vercel.app`) bzw. später `https://tisch6.at` öffnen → „Jetzt bewerben“.
2. Formular ausfüllen → Handynummer `0660 1234567` → Code `123456` → Foto aufnehmen oder auswählen.
3. Mit der KI-Gastgeberin chatten bis zum Ende.
4. In Supabase → **Table Editor → applications**: Die Bewerbung steht mit `status = submitted`,
   dem Chat-Verlauf (`transcript`), dem ausgewerteten `profile` (inkl. `wunschtage` und den vier Achsen) und `photo_path`.
   Unter **Storage → verification-photos** liegt eine Datei `….jpg.enc` – sie ist verschlüsselt und lässt sich
   absichtlich nicht als Bild öffnen. Angezeigt wird sie erst im Adminbereich (Etappe 3).
5. Am Ende erscheint dein Einladungslink („Bring eine Freundin mit“). In einem privaten Browserfenster öffnen und
   mit einer zweiten Testnummer bewerben (vorher in Supabase z. B. `436601234568=123456` ergänzen). Mit Häkchen „Wir bewerben uns zu zweit“ sind beide Einträge über `buddy_id`
   verknüpft; in jedem Fall steht beim zweiten Eintrag in `referred_by` die einladende Person (Empfehlungsprogramm).
6. Unter `/de/konto` den Status ansehen und die Löschfunktion testen.

---

**Was Etappe 1 noch nicht macht** (kommt in Etappe 2): automatische Bewertung (angenommen/abgelehnt/Warteliste, inkl.
Steuerung des Geschlechterverhältnisses), E-Mails über Resend, Matching und Tische, Stripe-Zahlung inkl. Gründungspaket,
Terminfestlegung nach Wunschtagen, Nachrücker, Lebenszeichen nach sieben Tagen, Gesprächskarte, Erinnerungen per
E-Mail und SMS, Notfallnummer, Meldeknopf, Wiedersehen-Abfrage, Feedback, Folgeeinladungen und Empfehlungsrabatt.
Resend und Stripe brauchst du deshalb erst in Etappe 2 einzurichten.
