# Checkliste: Tisch6 live schalten

Die Website läuft schon unter tisch6.at. Damit Bewerbungen, Tische und Zahlungen wirklich funktionieren, fehlt noch
das hier – in dieser Reihenfolge. Den aktuellen Stand zeigt der Adminbereich unter **Übersicht → Einrichtung**
(✓ = erledigt).

## 1. Damit Bewerbungen funktionieren

| Was | Wo | Variable in Vercel |
|---|---|---|
| Datenbank verbunden | Supabase → Project Settings (Anleitung Etappe 1, Schritt 1.3) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` |
| KI für das Kennenlern-Gespräch | console.anthropic.com → API Keys (Etappe 1, Schritt 3) | `ANTHROPIC_API_KEY` |
| Verschlüsselung der Verifizierungsfotos | ein langer Satz, mind. 32 Zeichen – nie mehr ändern | `PHOTO_ENCRYPTION_KEY` |
| SMS-Code bei der Bewerbung | Twilio-Konto, in Supabase unter **Authentication → Phone** eintragen (Etappe 1, Schritt 2) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` |
| Adresse der Website | – | `NEXT_PUBLIC_SITE_URL` = `https://tisch6.at` |

## 2. Damit Tisch6 von selbst läuft

| Was | Wo | Variable in Vercel |
|---|---|---|
| E-Mails (Antworten, Einladungen, Erinnerungen) | resend.com + DNS-Einträge bei GoDaddy (Etappe 2, Schritt 2 und 6) | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `ADMIN_EMAIL` |
| Automatischer Durchlauf alle 10 Minuten | Supabase → SQL Editor (Etappe 2, Schritt 1.3) | `CRON_SECRET` |
| Partnerlokale (4–5) | Adminbereich → **Lokale** | – |
| Notfallnummer am Abend | – | `EMERGENCY_PHONE` |
| Adminbereich | – | `ADMIN_PASSWORD` |

## 3. Damit bezahlt werden kann

| Was | Wo | Variable in Vercel |
|---|---|---|
| Zahlungen | stripe.com – erst Testmodus, vor den ersten echten Einladungen live schalten (Etappe 2, Schritt 3) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Vercel Pro | Der Gratis-Tarif ist nur für nicht-kommerzielle Nutzung – sobald echte Zahlungen laufen, auf Pro wechseln | – |

## 4. Rechtliches

- **Impressum, AGB, Datenschutz:** Die Stellen in [eckigen Klammern] brauchen deine echten Daten (Name bzw. Firma,
  Anschrift, Telefon, E-Mail, UID-Nummer und Gewerbe, falls vorhanden). Einfach schicken – sie werden eingetragen.
- **E-Mail-Adressen** wie `hallo@tisch6.at` und `datenschutz@tisch6.at` müssen wirklich ankommen
  (z. B. Weiterleitung bei GoDaddy auf deine eigene Adresse).
- **Gewerbe und Steuern** mit der Wirtschaftskammer bzw. einer Steuerberatung klären; AGB und Datenschutzerklärung
  vor dem Start einmal rechtlich prüfen lassen.

## 5. Generalprobe

1. Im Adminbereich unter **Übersicht → E-Mail und SMS testen** die eigene Handynummer eintragen und **Test senden**
   drücken – Test-E-Mail und Test-SMS müssen ankommen. Bei einem Fehler steht dort, was zu tun ist.
2. Selbst bewerben (mit eigener Handynummer) und das Kennenlern-Gespräch bis zum Ende führen.
3. Im Adminbereich unter **Bewerbungen** prüfen: Foto da, Profil ausgewertet, E-Mail „Bewerbung eingegangen“ im Postfach.
4. Unter **Versand** nachsehen, dass E-Mails und SMS wirklich verschickt wurden (nicht nur „protokolliert“).
5. Unter **Übersicht → Zahlung testen** eine Testzahlung über 1 € machen (Karte `4242 4242 4242 4242`) – danach steht
   dort „Testzahlung angekommen“.

Erst dann Stripe auf live stellen, mit einer echten Karte nochmal **Zahlung testen** und Tisch6 bekannt machen.
