# Etappe 2 – Einmalige Einrichtung

Ab jetzt läuft Tisch6 von selbst: Bewerbungen werden beantwortet, Tische zusammengestellt, Einladungen verschickt,
Zahlungen verbucht, Nachrücker gesucht, Erinnerungen gesendet und nach dem Abend Wiedersehen und Feedback abgefragt.
Dafür brauchst du einmalig: **Supabase** (Datenbank, Lokale, Zeitplan), **Resend** (E-Mails), **Stripe** (Zahlungen),
**Twilio** (SMS), neue **Vercel**-Variablen und DNS-Einträge bei **GoDaddy**. Dauer: ca. 60–90 Minuten.

> Voraussetzung: Etappe 1 ist eingerichtet (siehe `SETUP-ETAPPE-1.md`).

---

## 1. Supabase

### 1.1 Datenbank erweitern
**SQL Editor** → neue Abfrage → kompletten Inhalt von `supabase/migrations/0004_etappe2_dinner.sql` einfügen → **Run**.

### 1.2 Partnerlokale eintragen
Ohne Lokal kann kein Termin entstehen. **Einfacher ab Etappe 3:** im Adminbereich unter **Lokale** anlegen.
Ideal sind **vier bis fünf Lokale**: Die KI wechselt sie ab, niemand bekommt zweimal hintereinander dasselbe Lokal.

Bitte jedes Lokal vorab um zwei Dinge (beides steht auch in jeder Reservierungs-E-Mail):
- der Tisch ist immer auf den Namen **„Tisch6“** reserviert,
- die Rechnung wird **automatisch durch sechs geteilt**, jeder Gast zahlt seinen Teil selbst.

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

Weitere Lokale einfach genauso eintragen. Ohne E-Mail-Adresse geht die Reservierung an deine `ADMIN_EMAIL`.
Vorübergehend sperren: `update public.restaurants set active = false where name = 'Name des Lokals';`

### 1.3 Zeitplan: alle 10 Minuten ein automatischer Durchlauf
**SQL Editor** → ausführen. Das schaltet `pg_cron` und `pg_net` ein, legt im Vault ein zufälliges Geheimnis
(`cron_secret`) an und plant den Aufruf. Die letzte Zeile zeigt das Geheimnis: genau diesen Wert in Vercel als
`CRON_SECRET` eintragen (Schritt 5) – nie in einen Chat oder in den Code.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select vault.create_secret(
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  'cron_secret',
  'Tisch6: Geheimnis für den automatischen Durchlauf (gleich wie CRON_SECRET in Vercel)'
)
where not exists (select 1 from vault.secrets where name = 'cron_secret');

select cron.schedule(
  'tisch6-durchlauf',
  '*/10 * * * *',
  $$ select net.http_post(
       url := 'https://www.tisch6.at/api/cron/tick',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
       ),
       timeout_milliseconds := 60000
     ) $$
);

select decrypted_secret as "CRON_SECRET für Vercel" from vault.decrypted_secrets where name = 'cron_secret';
```

Die Adresse ist `www.tisch6.at`, weil `tisch6.at` dorthin weiterleitet – Weiterleitungen folgt der Aufruf nicht.
Kontrolle: `select status_code, created from net._http_response order by created desc limit 5;` – 200 heißt: läuft;
401 heißt: `CRON_SECRET` in Vercel passt nicht zum Wert im Vault (oder Production wurde noch nicht neu bereitgestellt).
Ändern: erst `select cron.unschedule('tisch6-durchlauf');`, dann neu anlegen.

Antworten, Erinnerungen und Nachrücker laufen rund um die Uhr. **Neue Tische plant die KI nur nachts**
(zwischen 1 und 6 Uhr Wiener Zeit) – so liegen die Einladungen morgens im Postfach. Als Sicherheitsnetz ruft
zusätzlich Vercel jede Nacht einmal auf (steht schon in `vercel.json`, dafür ist nichts zu tun).

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
Konto upgraden, Identitätsprüfung im Trust Hub, **Twilio Verify** für den Bewerbungs-Code in **Supabase → Phone**,
dazu ein Messaging Service mit Absender `Tisch6`, dessen Werte in Vercel kommen (Schritt 5) – für Erinnerungen und
Nachrücker-SMS. Diese kommen in Österreich erst an, wenn `Tisch6` als Sender-ID registriert ist.
Kosten: pro Gast und Tisch ca. zwei SMS (am Morgen die Notfallnummer, 2 Stunden vorher die Erinnerung),
plus Nachrücker-Angebote und – selten – eine SMS bei Verschiebung oder Absage.

## 5. Vercel – neue Variablen

**Settings → Environment Variables** ergänzen, danach **Deployments → ⋯ → Redeploy**:

| Name | Wert |
|---|---|
| `RESEND_API_KEY` | aus Schritt 2.4 |
| `EMAIL_FROM` | `Tisch6 <hallo@tisch6.at>` (erst nach bestätigter Domain) |
| `EMAIL_REPLY_TO` | deine eigene E-Mail-Adresse (Antworten landen bei dir) |
| `ADMIN_EMAIL` | deine E-Mail-Adresse – Meldungen vom Meldeknopf, abgesagte Tische, Hinweise |
| `STRIPE_SECRET_KEY` | aus Schritt 3.2 |
| `STRIPE_WEBHOOK_SECRET` | aus Schritt 3.3 |
| `TWILIO_ACCOUNT_SID` | aus Twilio |
| `TWILIO_AUTH_TOKEN` | aus Twilio |
| `TWILIO_MESSAGING_SERVICE_SID` | aus Twilio |
| `CRON_SECRET` | der Wert aus Schritt 1.3 (Vault: `cron_secret`), Typ Secret |
| `NEXT_PUBLIC_SITE_URL` | `https://tisch6.at`, sobald die Domain verbunden ist |
| `EMERGENCY_PHONE` | Notfallnummer, die alle Gäste am Tag des Tisches per SMS bekommen – z. B. dein Handy, `+43 660 1234567` |

## 6. GoDaddy – DNS für Resend

**Meine Produkte → tisch6.at → DNS → DNS-Einträge verwalten** → die Einträge aus Resend (Schritt 2.3) genau so
anlegen. Vorhandene `MX`-Einträge der Hauptdomain nicht anfassen, falls du dort schon E-Mail-Postfächer hast.
Nach 10–60 Minuten in Resend auf **Verify** tippen.

---

## So läuft es jetzt ab

| Wann | Was passiert automatisch |
|---|---|
| direkt nach dem Kennenlern-Gespräch | E-Mail „Bewerbung eingegangen“ |
| ca. 30 Min. später, spätestens nach 24 Stunden | KI-Prüfung, Antwort per E-Mail: **angenommen**, **abgelehnt** oder Warteliste (Geschlechterverhältnis wird intern gesteuert). Unklare Fälle landen bei dir zur Prüfung. Abgelehnte Bewerbungen werden nach 30 Tagen gelöscht |
| jede Nacht (1–6 Uhr) | Tischplanung: 3 Frauen + 3 Männer, ähnliches Temperament (ruhig–extrovertiert), möglichst gleiches Beziehungsziel, Werte und Wiedersehen-Erfahrungen fließen ein. Termin 6–21 Tage später an einem gemeinsamen Wunschtag, in einem anderen Lokal als beim letzten Mal. Einladung per E-Mail, 48 Stunden zum Bezahlen |
| Absage oder Einladung abgelaufen | erster passender Nachrücker bekommt E-Mail + SMS, 12 Stunden Zeit |
| ab 5 Zahlungen | der Tisch findet statt, das Lokal bekommt die Reservierung auf „Tisch6“ (mit der Bitte, die Rechnung durch sechs zu teilen) |
| alle sechs haben bezahlt | E-Mail „Tisch bestätigt“ an alle |
| 7 Tage ohne Tisch | „Wir suchen noch die richtigen fünf für dich“ |
| 24 Stunden vorher | weniger als 5 Zahlungen → der Tisch wird automatisch abgesagt; wer bezahlt hat, behält die Tischteilnahme als Guthaben (Geld zurück auf Wunsch) |
| 3 Tage / 1 Tag vorher | Erinnerung per E-Mail |
| am Tag, ab 9 Uhr | Gesprächskarte per E-Mail (drei Runden: Aperitif, Hauptgang, Dessert), Notfallnummer per SMS |
| 2 Stunden vorher | Erinnerung per E-Mail + SMS: Adresse, „reserviert auf Tisch6“, Tipp für alle, die zuerst da sind |
| ab 1 Stunde vorher bis 7 Tage danach | diskreter Meldeknopf auf der Einladungsseite und im Profil → E-Mail an dich, Profil pausiert bis zur Prüfung |
| Tag danach | Wiedersehen-Abfrage + drei Feedback-Fragen; beidseitig → Kontakte an beide. Wer wen wiedersehen wollte, merkt sich Tisch6 für die nächste Tischplanung |
| Tag 3 | Nichterscheinen (ab 2 Angaben), Fünfer-Rabatt, Empfehlungsrabatt, Folgeeinladung mit Ein-Klick-Zusage |
| danach | unbeantwortete Folgeeinladung nach 7 Tagen erneut, nach zwei verpassten nur noch monatlich |
| wöchentlich | die KI fasst das Feedback zu Lernnotizen zusammen, die ins Matching einfließen |

Verschieben oder absagen kannst du einen Tisch jederzeit im Adminbereich (Etappe 3) – alle sechs bekommen dann
E-Mail und SMS.

## Stellschrauben

Alle Regeln stehen in `src/lib/config.ts`: Preise, Gründungspaket, Fristen (48 h Einladung, 12 h Nachrücker,
24 h Entscheidung, 48 h kostenlose Absage), Mindestzahl Gäste (5), Zeitfenster der Tischplanung, Vorlauf für Termine,
Toleranz bei Altersspannen, Temperament-Abstand am Tisch, Geschlechterverhältnis.
Sag einfach, was du anders haben willst.
