# Etappe 2 – Einmalige Einrichtung

Ab jetzt läuft Tisch6 von selbst: Bewerbungen werden beantwortet, Tische zusammengestellt, Einladungen verschickt,
Zahlungen verbucht, Nachrücker gesucht, Erinnerungen gesendet und nach dem Abend Wiedersehen und Feedback abgefragt.
Dafür brauchst du einmalig: **Supabase** (Datenbank, Lokal, Zeitplan), **Resend** (E-Mails), **Stripe** (Zahlungen),
**Twilio** (SMS), neue **Vercel**-Variablen und DNS-Einträge bei **GoDaddy**. Dauer: ca. 60–90 Minuten.

> Voraussetzung: Etappe 1 ist eingerichtet (siehe `SETUP-ETAPPE-1.md`).

---

## 1. Supabase

### 1.1 Datenbank erweitern
**SQL Editor** → neue Abfrage → kompletten Inhalt von `supabase/migrations/0004_etappe2_dinner.sql` einfügen → **Run**.

### 1.2 Stammlokal eintragen
Ohne Lokal kann kein Termin entstehen. **Einfacher ab Etappe 3:** im Adminbereich unter **Lokale** anlegen.
Oder im **SQL Editor** (Werte anpassen):

```sql
insert into public.restaurants (name, address, district, email, phone, weekdays, start_time, tables_per_evening)
values (
  'Name des Lokals',
  'Neubaugasse 1, 1070 Wien',
  '7. Neubau',                 -- steht in der Einladung, die Adresse erst nach der Zusage
  'reservierung@lokal.at',     -- bekommt automatisch Reservierung + Küchenhinweise (ohne Namen)
  '+43 1 2345678',
  '{mo,di,mi,do,fr,sa,so}',    -- an welchen Tagen das Lokal einen Sechsertisch freihält
  '19:00',                     -- Beginn
  1                            -- wie viele Sechsertische pro Abend möglich sind
);
```

Ein zweites Lokal einfach genauso eintragen. Ohne E-Mail-Adresse geht die Reservierung an deine `ADMIN_EMAIL`.
Vorübergehend sperren: `update public.restaurants set active = false where name = 'Name des Lokals';`

### 1.3 Zeitplan: alle 10 Minuten ein automatischer Durchlauf
1. **Database → Extensions**: `pg_cron` und `pg_net` aktivieren.
2. **SQL Editor** (Adresse und Geheimnis anpassen – das Geheimnis ist dasselbe wie `CRON_SECRET` in Vercel, Schritt 5):

```sql
select cron.schedule(
  'tisch6-durchlauf',
  '*/10 * * * *',
  $$ select net.http_post(
       url := 'https://DEINE-ADRESSE/api/cron/tick',
       headers := jsonb_build_object('Authorization', 'Bearer DEIN_CRON_SECRET'),
       timeout_milliseconds := 60000
     ) $$
);
```

`DEINE-ADRESSE` ist deine Vercel-Adresse (z. B. `tisch6-abc.vercel.app`) bzw. später `tisch6.at`.
Ändern: erst `select cron.unschedule('tisch6-durchlauf');`, dann neu anlegen.
Kontrolle: **Integrations → Cron** zeigt jeden Lauf. Als Sicherheitsnetz ruft zusätzlich Vercel einmal täglich auf.

---

## 2. Resend (E-Mails) – gratis bis 3.000 E-Mails im Monat

1. Auf **resend.com** registrieren.
2. **Domains → Add Domain** → `tisch6.at` (eine Region in der EU wählen, falls angeboten).
3. Resend zeigt DNS-Einträge (typisch: `MX` und `TXT` für `send`, `TXT` für `resend._domainkey`). Diese bei GoDaddy eintragen (Schritt 6), danach in Resend **Verify**.
4. **API Keys → Create API Key** (Berechtigung „Sending access“) → wird `RESEND_API_KEY`.

Bis die Domain bestätigt ist, verschickt Resend nur an deine eigene Adresse. Ohne `RESEND_API_KEY` werden E-Mails
gar nicht verschickt, sondern nur im Vercel-Log protokolliert – praktisch zum gefahrlosen Ausprobieren.

## 3. Stripe (Zahlungen)

1. Auf **stripe.com** registrieren und zuerst im **Testmodus** bleiben (Schalter oben).
2. **Developers → API keys** → „Secret key“ (`sk_test_…`) → wird `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://DEINE-ADRESSE/api/stripe/webhook`
   - Ereignisse: `checkout.session.completed` und `checkout.session.async_payment_succeeded`
   - Danach „Signing secret“ (`whsec_…`) kopieren → wird `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Payment methods**: Karten, Apple Pay, Google Pay und **EPS** (in Österreich beliebt) einschalten.
5. Testzahlung: Karte `4242 4242 4242 4242`, beliebiges Ablaufdatum in der Zukunft, beliebige Prüfziffer.
6. **Live gehen:** Konto aktivieren (Firmendaten, Bankkonto), dann Live-Schlüssel (`sk_live_…`) und einen neuen
   Live-Webhook genauso anlegen und in Vercel austauschen. Kosten: ca. 1,5 % + 0,25 € pro europäischer Kartenzahlung.

## 4. SMS über Twilio (Verifizierung, Erinnerungen, Nachrücker)

Falls du in Etappe 1 Platzhalter eingetragen hast, jetzt echt einrichten (Anleitung Etappe 1, Schritt 2):
Konto upgraden, Messaging Service mit Absender `Tisch6`, die echten Werte in **Supabase → Phone** eintragen –
und zusätzlich in Vercel (Schritt 5), damit auch Erinnerungen und Nachrücker-SMS rausgehen.
Kosten: pro Gast und Dinner ca. zwei SMS (1 Tag und 2 Stunden vorher), plus Nachrücker-Angebote.

## 5. Vercel – neue Variablen

**Settings → Environment Variables** ergänzen, danach **Deployments → ⋯ → Redeploy**:

| Name | Wert |
|---|---|
| `RESEND_API_KEY` | aus Schritt 2.4 |
| `EMAIL_FROM` | `Tisch6 <hallo@tisch6.at>` (erst nach bestätigter Domain) |
| `EMAIL_REPLY_TO` | deine eigene E-Mail-Adresse (Antworten landen bei dir) |
| `ADMIN_EMAIL` | deine E-Mail-Adresse – Meldungen vom Meldeknopf, verschobene Dinner, Hinweise |
| `STRIPE_SECRET_KEY` | aus Schritt 3.2 |
| `STRIPE_WEBHOOK_SECRET` | aus Schritt 3.3 |
| `TWILIO_ACCOUNT_SID` | aus Twilio |
| `TWILIO_AUTH_TOKEN` | aus Twilio |
| `TWILIO_MESSAGING_SERVICE_SID` | aus Twilio |
| `CRON_SECRET` | ein langes, zufälliges Geheimnis (mind. 32 Zeichen) – dasselbe wie in Schritt 1.3 |
| `NEXT_PUBLIC_SITE_URL` | `https://tisch6.at`, sobald die Domain verbunden ist |

## 6. GoDaddy – DNS für Resend

**Meine Produkte → tisch6.at → DNS → DNS-Einträge verwalten** → die Einträge aus Resend (Schritt 2.3) genau so
anlegen. Vorhandene `MX`-Einträge der Hauptdomain nicht anfassen, falls du dort schon E-Mail-Postfächer hast.
Nach 10–60 Minuten in Resend auf **Verify** tippen.

---

## So läuft es jetzt ab

| Wann | Was passiert automatisch |
|---|---|
| ca. 30 Min. nach der Bewerbung | KI-Prüfung, Antwort per E-Mail: angenommen oder Warteliste (Geschlechterverhältnis wird intern gesteuert) |
| sobald 3 Frauen + 3 Männer passen | Tisch steht, Termin 6–21 Tage später an einem gemeinsamen Wunschtag, Einladung per E-Mail, 48 Stunden zum Bezahlen |
| Absage oder Einladung abgelaufen | erster passender Nachrücker bekommt E-Mail + SMS, 12 Stunden Zeit |
| 7 Tage ohne Tisch | „Wir suchen noch die richtigen fünf für dich“ |
| 72 Stunden vorher | ab 5 Zusagen findet das Dinner statt und das Lokal bekommt die Reservierung; sonst verschoben und automatisch erstattet |
| 3 Tage / 1 Tag / 2 Stunden vorher | Erinnerungen mit Adresse; am Vortag mit Eisbrecher-Karte (E-Mail + SMS) |
| am Abend bis 7 Tage danach | diskreter Meldeknopf auf der Einladungsseite → E-Mail an dich, Profil pausiert bis zur Prüfung |
| Tag danach | Wiedersehen-Abfrage + drei Feedback-Fragen; beidseitig → Kontakte an beide |
| Tag 3 | Nichterscheinen (ab 2 Angaben), Fünfer-Rabatt, Empfehlungsrabatt, Folgeeinladung mit Ein-Klick-Zusage |
| danach | unbeantwortete Folgeeinladung nach 7 Tagen erneut, nach zwei verpassten nur noch monatlich |
| wöchentlich | die KI fasst das Feedback zu Lernnotizen zusammen, die ins Matching einfließen |

## Stellschrauben

Alle Regeln stehen in `src/lib/config.ts`: Preise, Gründungspaket, Fristen (48 h Einladung, 12 h Nachrücker,
72 h Entscheidung, 48 h kostenlose Absage), Vorlauf für Termine, Toleranz bei Altersspannen, Geschlechterverhältnis.
Sag einfach, was du anders haben willst.
