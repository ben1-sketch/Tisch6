# Etappe 3 – Adminbereich

Unter **`/admin`** siehst du alles, was Tisch6 automatisch macht – und kannst jederzeit eingreifen:
Bewerbungen mit Verifizierungsfoto, Profile, Warteliste, Dinner und Tische, Zahlungen, Wiedersehen-Matches,
Feedback, Meldungen, Stammlokale und jede verschickte E-Mail und SMS. Dauer der Einrichtung: ca. 10 Minuten.

> Voraussetzung: Etappe 1 und 2 sind eingerichtet (siehe `SETUP-ETAPPE-1.md` und `SETUP-ETAPPE-2.md`).

---

## 1. Supabase – Datenbank ergänzen

**SQL Editor** → neue Abfrage → kompletten Inhalt von `supabase/migrations/0005_etappe3_admin.sql` einfügen → **Run**.
Kann gefahrlos mehrfach ausgeführt werden.

## 2. Vercel – Admin-Passwort setzen

1. Ein langes Passwort ausdenken – **mindestens 12 Zeichen**, besser 20 oder mehr (am einfachsten vom
   Passwort-Manager erzeugen lassen).
2. **Settings → Environment Variables** → neue Variable `ADMIN_PASSWORD` mit diesem Passwort → **Save**.
3. **Deployments → ⋯ → Redeploy**.

Das Passwort gehört nur in Vercel und in deinen Passwort-Manager – bitte nie in einen Chat oder eine E-Mail.

## 3. Anmelden

`https://tisch6.at/admin` (bzw. deine Vercel-Adresse + `/admin`) öffnen → Passwort eingeben.

- Die Anmeldung gilt 12 Stunden, danach einfach neu anmelden. „Abmelden“ beendet sie sofort.
- Passwort vergessen oder Verdacht, dass es jemand kennt? In Vercel ein neues `ADMIN_PASSWORD` setzen und neu
  deployen – damit sind alle bisherigen Anmeldungen sofort ungültig.
- Nach 8 falschen Versuchen innerhalb von 15 Minuten ist die Anmeldung von diesem Anschluss eine Viertelstunde gesperrt.
- Suchmaschinen sehen den Adminbereich nicht.

## 4. Erste Schritte

1. **Übersicht → Einrichtung:** Die Liste zeigt, was noch fehlt (z. B. Resend, Stripe, Twilio, Stammlokal,
   automatischer Durchlauf). Alles mit ✓ läuft.
2. **Lokale:** Stammlokal direkt hier anlegen – der SQL-Befehl aus Etappe 2 ist damit nicht mehr nötig.
   Tage ankreuzen, an denen das Lokal einen Sechsertisch freihalten kann.
3. **Versand:** Hier siehst du jede E-Mail und SMS. „Nur protokolliert“ heißt: Resend bzw. Twilio ist noch nicht
   eingerichtet – die Nachricht wäre sonst verschickt worden.

Bei **GoDaddy, Resend, Stripe und Twilio** ist für Etappe 3 nichts zu tun.

---

## Was wo steht

| Bereich | Inhalt |
|---|---|
| **Übersicht** | Kennzahlen (Prüfungen, Meldungen, wer auf einen Tisch wartet – nach Frauen/Männern), nächste Dinner, Umsatz, Gründungsmitglieder, Einrichtungs-Check, letzte Eingriffe, Knopf „Durchlauf jetzt starten“ |
| **Bewerbungen** | Filter: zur Prüfung, warten auf Antwort, warten auf Tisch, Warteliste, angenommen, im Gespräch, gesperrt; Suche nach Vorname, E-Mail oder Nummer |
| **Profil** | Verifizierungsfoto, Kontakt, Profil, Persönlichkeit, KI-Prüfung, kompletter Kennenlern-Chat, Tische, Zahlungen, Meldungen, Wiedersehen, Empfehlungen, Versand, interne Notiz |
| **Dinner** | Jede Runde mit Plätzen, Zahlungsstand, Eisbrecher-Karten, Begründung der KI, passenden Nachrückern und Feedback |
| **Meldungen** | Alles vom diskreten Meldeknopf – erledigen oder Profil sperren |
| **Zahlungen** | Einnahmen, Erstattungen, Gründungspakete (x von 300), von Hand bestätigte Plätze, Link zu Stripe |
| **Wiedersehen** | Alle gegenseitigen Matches |
| **Feedback** | Bewertungen, Verbesserungsvorschläge und die Lernnotizen der KI |
| **Lokale** | Stammlokale anlegen, bearbeiten, pausieren |
| **Versand** | Jede E-Mail und SMS mit Status und Fehlermeldung |
| **Protokoll** | Jeder Eingriff und jede Anmeldung – ohne Namen |

## Typische Eingriffe

| Situation | Wo | Was passiert |
|---|---|---|
| Bewerbung „zur Prüfung“ (KI war unsicher) | Profil → **Annehmen** oder **Sperren** | Person bekommt die passende E-Mail |
| Meldung vom Meldeknopf | Meldungen → **Erledigt** oder **Profil sperren** | Gesperrt: offene Plätze werden freigegeben und erstattet, Nachrücker gesucht; neutrale E-Mail ohne Hinweis auf die Meldung |
| Gast sagt per E-Mail kurzfristig ab | Dinner → **Platz stornieren** (mit oder ohne Erstattung) | Nachrücker wird eingeladen, das Lokal bekommt die neue Personenzahl |
| Jemand hat bar bezahlt oder ist eingeladen | Dinner → **Von Hand bestätigen** (Betrag eintragen, 0 = gratis) | Platz ist fix, Bestätigung per E-Mail |
| Einladung läuft gleich ab | Dinner → **Frist +24 h** | – |
| Lieber eine bestimmte Person nachrücken lassen | Dinner → **Passende Nachrücker → Einladen** | E-Mail + SMS, 12 Stunden Zeit |
| Lokal fällt aus | Dinner → **Dinner absagen** | Alle Gäste informiert, Zahlungen erstattet, Lokal bekommt eine Stornierung |
| Lokal hat die Reservierung verlegt | Dinner → **Reservierung erneut senden** | – |
| Als Entschuldigung | Profil → **Gutschreiben** (1–3 freie Tischteilnahmen) oder **Rabatt geben** | Person bekommt eine E-Mail |
| Jemand kam nicht, das Feedback zeigt es aber nicht | Dinner → **Nicht erschienen** | Beim zweiten Mal wird gesperrt; **Doch da gewesen** macht es rückgängig |
| Löschanfrage per E-Mail (DSGVO) | Profil → **Endgültig löschen** | Foto, Profil, Chat und Login weg; Zahlungsbelege bleiben ohne Namen für die Buchhaltung |
| Etwas soll sofort passieren statt in 10 Minuten | Übersicht → **Durchlauf jetzt starten** | Bewertet, plant Tische, verschickt Fälliges |

Jede Aktion fragt bei folgenreichen Schritten noch einmal nach und zeigt danach, was passiert ist.
