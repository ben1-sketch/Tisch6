# Etappe 3 – Adminbereich

Unter **`/admin`** siehst du alles, was Tisch6 automatisch macht – und kannst jederzeit eingreifen:
Bewerbungen mit Verifizierungsfoto, Profile, Warteliste, Tische mit Zahlungsstatus, Gesprächskarten zum Ausdrucken,
Zahlungen, Wiedersehen und Feedback, Meldungen, Partnerlokale und jede verschickte E-Mail und SMS.
Dauer der Einrichtung: ca. 10 Minuten.

> Voraussetzung: Etappe 1 und 2 sind eingerichtet (siehe `SETUP-ETAPPE-1.md` und `SETUP-ETAPPE-2.md`).

> **Etappe 3 schon eingerichtet?** Für die Änderungen aus dem Brief v4 (Beziehungsziel und Werte, lernendes
> Matching, Gesprächskarte, 24-Stunden-Regel, Verschieben/Absagen, Notfallnummer) brauchst du nur:
> 1. Supabase → **SQL Editor** → Inhalt von `supabase/migrations/0006_brief_v4.sql` einfügen → **Run**.
> 2. Vercel → **Settings → Environment Variables** → `EMERGENCY_PHONE` mit deiner Notfallnummer anlegen
>    (z. B. `+43 660 1234567`) → **Save** → **Deployments → ⋯ → Redeploy**.
> 3. Im Adminbereich unter **Lokale** vier bis fünf Partnerlokale anlegen und jedes Lokal bitten, auf „Tisch6“ zu
>    reservieren und getrennt abzurechnen (siehe Schritt 4).
>
> Der Zeitplan in Supabase bleibt, wie er ist.

---

## 1. Supabase – Datenbank ergänzen

**SQL Editor** → neue Abfrage → kompletten Inhalt von `supabase/migrations/0005_etappe3_admin.sql` einfügen → **Run**.
Danach genauso mit `supabase/migrations/0006_brief_v4.sql`.
Beide können gefahrlos mehrfach ausgeführt werden.

## 2. Vercel – Admin-Passwort und Notfallnummer setzen

1. Ein langes Passwort ausdenken – **mindestens 12 Zeichen**, besser 20 oder mehr (am einfachsten vom
   Passwort-Manager erzeugen lassen).
2. **Settings → Environment Variables** → neue Variable `ADMIN_PASSWORD` mit diesem Passwort → **Save**.
3. Falls noch nicht da: `EMERGENCY_PHONE` mit der Nummer, unter der Gäste am Abend jemanden erreichen
   (z. B. dein Handy) → **Save**. Ohne diese Variable geht am Tag des Tisches keine Notfall-SMS raus.
4. **Deployments → ⋯ → Redeploy**.

Das Passwort gehört nur in Vercel und in deinen Passwort-Manager – bitte nie in einen Chat oder eine E-Mail.

## 3. Anmelden

`https://tisch6.at/admin` (bzw. deine Vercel-Adresse + `/admin`) öffnen → Passwort eingeben.

- Die Anmeldung gilt 12 Stunden, danach einfach neu anmelden. „Abmelden“ beendet sie sofort.
- Passwort vergessen oder Verdacht, dass es jemand kennt? In Vercel ein neues `ADMIN_PASSWORD` setzen und neu
  deployen – damit sind alle bisherigen Anmeldungen sofort ungültig.
- Nach 8 falschen Versuchen innerhalb von 15 Minuten ist die Anmeldung von diesem Anschluss eine Viertelstunde gesperrt.
- Suchmaschinen sehen den Adminbereich nicht.

## 4. Erste Schritte

1. **Übersicht → Einrichtung:** Die Liste zeigt, was noch fehlt (z. B. Resend, Stripe, Twilio, Notfallnummer,
   Partnerlokal, automatischer Durchlauf). Alles mit ✓ läuft.
2. **Lokale:** vier bis fünf Partnerlokale anlegen – die KI wechselt sie ab, niemand bekommt zweimal
   hintereinander dasselbe Lokal. Tage ankreuzen, an denen das Lokal einen Sechsertisch freihalten kann.
   Mit jedem Lokal einmal kurz absprechen: Reservierung immer auf **„Tisch6“**, **getrennte Rechnung** –
   jeder Gast zahlt, was er bestellt hat. Beides steht zusätzlich in jeder Reservierungs-E-Mail.
3. **Versand:** Hier siehst du jede E-Mail und SMS. „Nur protokolliert“ heißt: Resend bzw. Twilio ist noch nicht
   eingerichtet – die Nachricht wäre sonst verschickt worden.

Bei **GoDaddy, Resend, Stripe und Twilio** ist für Etappe 3 nichts zu tun.

---

## Was wo steht

| Bereich | Inhalt |
|---|---|
| **Übersicht** | Umsatz der Woche, Frauen : Männer, Prüfungen, Meldungen, wer auf einen Tisch wartet, nächste Tische, Gründungsmitglieder, Einrichtungs-Check, letzte Eingriffe; Knöpfe „Durchlauf jetzt starten“ und „Tische jetzt planen“ |
| **Bewerbungen** | Filter: zur Prüfung, warten auf Antwort, warten auf Tisch, Warteliste, angenommen, im Gespräch, gesperrt, abgelehnt; Suche nach Vorname, E-Mail oder Nummer |
| **Profil** | Verifizierungsfoto, Kontakt, **Annehmen / Ablehnen**, Profil, Persönlichkeit, KI-Entscheidung mit Begründung, kompletter Kennenlern-Chat, Tische, Zahlungen & Guthaben, Meldungen, Wiedersehen, Empfehlungen, Versand, interne Notiz. Beziehungsziel und Werte nutzt nur die KI fürs Matching – sie werden nirgends angezeigt |
| **Tische** | Jede Runde mit Teilnehmern und Zahlungsstatus (**rot = unbezahlt**), Gesprächskarte mit **Druckversion**, Begründung der KI, passende Nachrücker, Lokal und Reservierung, **Verschieben / Absagen**, Feedback |
| **Wiedersehen & Feedback** | Matches pro Tisch, Bewertungen, welche Lokale und welche Konstellationen funktionieren (Temperament, Beziehungsziel, Altersspanne, sechs oder fünf), Lernnotizen der KI, neuestes Feedback |
| **Meldungen** | Alles vom diskreten Meldeknopf – erledigen oder Profil sperren |
| **Zahlungen** | Einnahmen, Erstattungen, Gründungspakete (x von 300), von Hand bestätigte Plätze, Link zu Stripe |
| **Lokale** | Partnerlokale anlegen, bearbeiten, pausieren |
| **Versand** | Jede E-Mail und SMS mit Status und Fehlermeldung |
| **Protokoll** | Jeder Eingriff und jede Anmeldung – ohne Namen |

## Typische Eingriffe

| Situation | Wo | Was passiert |
|---|---|---|
| Bewerbung „zur Prüfung“ (KI war unsicher) | Profil → **Annehmen** oder **Ablehnen** | Person bekommt die passende E-Mail; Abgelehnte werden nach 30 Tagen gelöscht |
| Meldung vom Meldeknopf | Meldungen → **Erledigt** oder **Profil sperren** | Gesperrt: offene Plätze werden freigegeben und erstattet, Nachrücker gesucht; neutrale E-Mail ohne Hinweis auf die Meldung |
| Lokal fällt aus oder der Termin passt nicht | Tische → **Verschieben** (neuer Termin, auf Wunsch anderes Lokal) | Alle sechs bekommen E-Mail + SMS mit dem neuen Termin und können kostenlos absagen; das alte Lokal bekommt eine Stornierung, das neue die Reservierung |
| Tisch kann gar nicht stattfinden | Tische → **Tisch absagen** (Guthaben oder Geld zurück) | Alle sechs bekommen E-Mail + SMS, das Lokal eine Stornierung, alle kommen zurück in den Pool |
| Gast sagt per E-Mail kurzfristig ab | Tische → **Platz stornieren** (mit oder ohne Erstattung) | Nachrücker wird eingeladen, das Lokal bekommt die neue Personenzahl |
| Jemand hat bar bezahlt oder ist eingeladen | Tische → **Von Hand bestätigen** (Betrag eintragen, 0 = gratis) | Platz ist fix, Bestätigung per E-Mail |
| Einladung läuft gleich ab | Tische → **Frist +24 h** | – |
| Lieber eine bestimmte Person nachrücken lassen | Tische → **Passende Nachrücker → Einladen** | E-Mail + SMS, bis zu 12 Stunden Zeit |
| Gesprächskarte auf den Tisch legen | Tische → Gesprächskarte → **Druckversion** | Druckfertige Karte mit drei Runden und den zwei Regeln; per E-Mail kommt sie am Tag selbst automatisch |
| Lokal hat die Reservierung verlegt | Tische → **Reservierung erneut senden** | – |
| Als Entschuldigung | Profil → **Gutschreiben** (1–3 freie Tischteilnahmen) oder **Rabatt geben** | Person bekommt eine E-Mail |
| Jemand kam nicht, das Feedback zeigt es aber nicht | Tische → **Nicht erschienen** | Beim zweiten Mal wird gesperrt; **Doch da gewesen** macht es rückgängig |
| Löschanfrage per E-Mail (DSGVO) | Profil → **Endgültig löschen** | Foto, Profil, Chat und Login weg; Zahlungsbelege bleiben ohne Namen für die Buchhaltung |
| Neue Tische sollen nicht bis zur Nacht warten | Übersicht → **Tische jetzt planen** | Die KI plant sofort, Einladungen gehen gleich raus |
| Etwas anderes soll sofort passieren statt in 10 Minuten | Übersicht → **Durchlauf jetzt starten** | Beantwortet Bewerbungen, verschickt Fälliges |

Jede Aktion fragt bei folgenreichen Schritten noch einmal nach und zeigt danach, was passiert ist.
