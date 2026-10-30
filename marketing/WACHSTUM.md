# Wachstum: Wie Tisch6 zu mehr Gästen kommt

Das Gedächtnis des wöchentlichen Wachstums-Checks (donnerstags). Jede Woche: messen, Engpass finden,
ein bis zwei Versuche umsetzen, Ergebnis hier festhalten. Neueste Woche oben. Instagram hat eigene Notizen in
`social/LEARNINGS.md` (Check am Montag).

## Spielregeln

- Ziel: mehr passende Bewerbungen und mehr volle Tische – nicht einfach mehr Bewerbungen.
- Erst der Engpass: Fehlt eine Gruppe (z. B. Männer 35–48), zielen Inhalte, Seiten und Werbung genau darauf.
- Jeder Versuch hat eine Annahme, eine Änderung, eine Messgröße und nach 2–4 Wochen ein Ergebnis.
- Selbst umsetzen: Texte, Themenseiten, Mail-Texte, Instagram-Schwerpunkte, kleine Verbesserungen im Ablauf.
- Nur vorschlagen, der Inhaber entscheidet: Preise, Matching-Regeln, Lokale, Werbebudget, AGB, neue Presse-Empfänger.
- Nie: Fotos von Gästen, Bots oder gekaufte Follower, Zahlen, die sich nicht belegen lassen, Daten einzelner Personen.
- Den Hinweis „Gerade besonders gefragt: …“ beim Einladungslink (`src/i18n/dictionaries/de.ts`, `apply.buddy.wanted`) an den aktuellen Engpass anpassen.
- Kein Rabatt nur für ein Geschlecht (Gleichbehandlungsgesetz); Werbung gezielt an eine Gruppe ausspielen ist erlaubt.
- Keine eigene Seite und keine Werbung für „Singles ab 50“ – Wunsch des Inhabers (28.10.2026).
- Am Tisch höchstens 10 Jahre Altersabstand. Einzige Ausnahme: der erste Tisch am 5.11.2026 (bis 12 Jahre beim Nachrücken,
  `TABLE_EXCEPTIONS` in `src/lib/config.ts`) – Wunsch des Inhabers. Keine weiteren Ausnahmen ohne seine Zustimmung.
- Aufrufe an Wartende (`CAMPAIGNS` in `src/lib/config.ts`) nur mit Zustimmung des Inhabers, höchstens einer pro Person im Monat,
  immer mit Abbestell-Link (ein Klick trägt automatisch aus). Wer stattdessen „Stopp“ antwortet, bekommt im Adminbereich
  „Keine Aufrufe mehr“.
- Wer jemanden über den Einladungslink einlädt, sitzt nie mit ihm am selben Tisch (wie bei Duos).
- Tischplanung nimmt immer den frühesten möglichen Abend; die KI wählt nur unter den Runden an diesem Abend
  (Wunsch des Inhabers, 28.10.2026: Tisch 2 am 4.11. statt 12.11.).

## Laufende Versuche

| Seit | Versuch | Annahme | Messgröße |
| --- | --- | --- | --- |
| 28.10.2026 | Vier Themenseiten für Google (Dinner-Dating, Singles Wien, Singles ab 40, Speed-Dating-Alternative) | Wer aktiv sucht, bewirbt sich eher | Bewerbungen mit Herkunft „Google“ |
| 28.10.2026 | Acht weitere Themenseiten und Übersicht `/de/ratgeber` (Frauen kennenlernen, Partnersuche, Dating ohne App, Singles ab 30, Single-Events, Blind Date, Neue Leute kennenlernen, Wo man Singles kennenlernt) – jede mit eigenem Inhalt, keine Massen-Seiten | Mehr Suchbegriffe, mehr Wege zu uns; „Frauen kennenlernen“ zielt auf Männer | Klicks je Seite (Search Console), Herkunft „Google“ |
| 28.10.2026 | Pressetext an 13 Wiener Redaktionen verschickt (Liste unten) | Ein Artikel bringt einen Schub, vor allem Ältere | Artikel/Erwähnungen, Herkunft „Presse“ |
| 28.10.2026 | Matching-Regeln etwas großzügiger (Wunschalter ±3, Temperament-Abstand 3) | Mehr Tische kommen zustande | Tische pro Woche, Feedback „Runde“ |
| 28.10.2026 | Herkunft jeder Bewerbung erfassen | Grundlage für alle Entscheidungen | Anteil Bewerbungen mit Angabe |
| 28.10.2026 | Erinnerung an angefangene Bewerbungen (höchstens 2 Mails, tagsüber; Link `?weiter=1` direkt zur Anmeldung) | Wer nach Foto oder erster Frage abbricht, kommt mit einem Anstoß zurück | Anteil angefangener Bewerbungen, die nach einer Erinnerung abgeschlossen werden (Versandprotokoll, Art „unfinished“) |
| 28.10.2026 | Freie Plätze laufend nachbesetzen (tagsüber alle 10 Minuten) und keine Warteliste für Bewerbungen, die sofort auf einen freien Platz passen – Anlass: Absage am ersten Tisch (5.11.), keine passende Frau im Pool | Lücken an Tischen schließen sich, sobald jemand Passendes da ist | Tische mit 6 statt 5, Nachrücker-Angebote und Zusagen |
| 28.10.2026 | Erinnerung an offene Einladungen: zur Halbzeit der Zusagefrist eine E-Mail + SMS (tagsüber, nicht während jemand gerade zahlt, mit „X Personen haben schon fix zugesagt“) – Anlass: am ersten Tisch hatten erst 2 von 6 bezahlt | Wer die Einladung übersehen oder die Zahlung abgebrochen hat, sagt doch noch zu | Anteil offener Einladungen, die nach der Erinnerung bezahlt werden (Versandprotokoll, Art „invite_reminder“) |
| 28.10.2026 | Aufruf an die wartenden Frauen (E-Mail am 29.10. ab 9 Uhr, Aufruf `maenner-35-47`): „Kennst du einen Single-Mann zwischen 35 und 47?“ mit persönlichem Einladungslink, WhatsApp-Knopf und Empfehlungsrabatt – Anlass: dem zweiten Tisch fehlt genau ein Mann (35–47, Mi/Do/Fr/So) | Frauen kennen passende Männer und schicken ihnen den Link | Bewerbungen mit Herkunft „Empfehlung“ und Detail „aufruf“, davon Männer 35–47; ob der zweite Tisch entsteht |
| 28.10.2026 | Gratis-Kanäle laut Startpaket (Claude Docs „Gratis-Kanäle: Startpaket für Tisch6“): Facebook-Gruppe „Singles & Freunde Österreich“, LinkedIn-Beitrag des Inhabers, MeinBezirk-Regionaut, WhatsApp ans eigene Netzwerk – jeweils eigener utm-Link | Männer 35–48 sind dort erreichbar, ohne Werbebudget | Bewerbungen je Herkunft (facebook / linkedin / meinbezirk / whatsapp), Anteil Männer 35–48; zuerst prüfen, was der Inhaber davon umgesetzt hat |
| 28.10.2026 | Tischkarte mit QR-Code im Partnerlokal (`marketing/lokale/`, utm lokal / tischkarte / neuehoheit) | Andere Gäste des Lokals werden neugierig | Bewerbungen mit Detail „lokal / tischkarte / …“ |
| 28.10.2026 | Einladungslink im Konto: Knopf „Per WhatsApp schicken“ und Hinweis „Gerade besonders gefragt: Männer zwischen 35 und 48“ | Bewerberinnen kennen passende Männer | Bewerbungen mit Herkunft „Empfehlung“, davon Männer |
| 28.10.2026 | Google: Organisations-Angaben auf der Startseite; Search Console wartet auf den Bestätigungs-Code des Inhabers (kein Unternehmensprofil – Richtlinien passen nicht) | Die Suche nach „Tisch6“ zeigt die Marke sauber, Themenseiten werden schneller gefunden | Impressionen und Klicks in der Search Console, Herkunft „Google“ |
| 29.10.2026 | KI-Suche: Kurzbeschreibung `tisch6.at/llms.txt` für ChatGPT und Co. (Ablauf, Preise, für wen, „gerade gesucht: Männer 35–47“, Links zu den Themenseiten) – Anlass: ein Mann (46) kam über ChatGPT | Wer eine KI fragt, wo man in Wien Singles kennenlernt, bekommt Tisch6 genannt | Bewerbungen mit Herkunft-Detail „chatgpt.com“ oder „perplexity“, davon Männer 35–47 |
| 29.10.2026 | Aufruf an die wartenden Männer (Aufruf `freund-35-47`, Zustimmung des Inhabers am 29.10.): „Kennst du einen Mann zwischen 35 und 47, der Single ist?“ mit persönlichem Einladungslink und WhatsApp-Knopf | Männer kennen passende Männer – Freunde, Kollegen, Brüder | Bewerbungen mit Herkunft „Empfehlung“ und Detail „aufruf“ von Männern 35–47, getrennt nach einladender Person (Mann/Frau) |
| 29.10.2026 | Hinweis beim Einladungslink genauer: „Männer zwischen 35 und 47, die mittwochs, donnerstags oder freitags Zeit haben“ | Eine genaue Bitte bringt passendere Empfehlungen | Bewerbungen über Einladungslinks, davon Männer 35–47 mit Mi/Do/Fr |

## Nächste Schritte aus der Kanal-Recherche (28.10.2026)

Ganzer Bericht: `marketing/recherche/kanaele-2026-10-28.md`. Kernaussage: Die Männer 35–48 gibt es, sie kommen über
Menschen, die sie kennen, und über Orte, an denen sie schon sind – nicht über mehr Reichweite für alle.

1. Inhaber: Startpaket umsetzen (Facebook-Gruppe, LinkedIn, MeinBezirk, WhatsApp) – Texte fertig.
2. Inhaber: Search-Console-Code schicken; Dating-Genehmigung bei Meta (am 30.10.2026 beantragt) und Zertifizierung bei Google beantragen.
   Bis zur Meta-Zusage keine Beiträge bezahlt bewerben.
3. Claude: Hinweis „Gerade besonders gefragt …“ auch in die Mails an Wartende – Text vorher vom Inhaber freigeben lassen.
4. Inhaber: Tischkarten zu Neuehoheit, weitere Lokale fragen. Claude: Karten für jedes neue Lokal.
5. Nach Freigabe durch den Inhaber: neue Medien (Kronehit, 88.6, Radio Arabella, futurezone, Trending Topics, brutkasten,
   „Wiener“, „Treffpunkt Österreich“) und Nachfassen bei den 13 Redaktionen nach dem ersten Abend am 5.11.
6. Entscheidung Inhaber: fester Anker-Abend (z. B. donnerstags ein Tisch für 35–45). Erst damit gehen Eventkalender
   (Eventbrite, Eventfrog, Falter, MeinBezirk) und Veranstaltungsdaten für Google.
7. Gutschein „Schenk ihm einen Abend“ ab Ende November; vorher die Verfallsregel des Gründungspakets (12 Monate) rechtlich prüfen lassen.
8. Valentinswoche 8.–12.2.2027 mit Social Run Club Vienna und Padel-Anlagen.
9. Nach Meta-Freigabe: Test mit 300 € an Männer 35–48 in Wien, gemessen in Kosten pro Bewerbung eines Mannes.

Offen: Männeranteil in Laufclubs und beim Padel; ob die Zahlen der Facebook-Gruppe (Stand 2024) noch stimmen; ob der
Falter kommerzielle Dating-Abende in den Kalender nimmt.

## Woche bis 29.10.2026 (Wachstums-Check)

- Bewerbungen: 25 abgeschickt seit dem Start am 22.10. (Vorwoche: noch kein Betrieb), alle angenommen – 15 Frauen, 10 Männer;
  1 angefangen, nicht abgeschickt.
- Herkunft (erfasst seit 28.10.): 3 von 3 mit Angabe – Instagram 1, Empfehlung über Einladungslink 1, ChatGPT 1 (Mann, 46).
- Wartend: 12 Frauen (30–34: 1 · 35–39: 1 · 40–44: 7 · 45–49: 3) und 6 Männer (unter 30: 1 · 35–39: 2 · 40–44: 1 ·
  45–49: 1 · 50+: 1); 1 Mann pausiert.
- Tische: 1 geplant (Do 5.11.): 2 bezahlt, 4 offen (Frist 31.10., 01:00), 1 Absage nachbesetzt. Noch kein Abend – daher
  noch kein Feedback und kein Wiedersehen.
- Zusagequote: 2 von 3 entschiedenen Einladungen; 4 offen. Umsatz der Woche: 76 € (2 Plätze).
- Instagram: 67 Follower am 27.10. (24.10.: 22), 7 Beiträge, Reichweite 22.–27.10. zusammen rund 27.800 (Tagessummen).
- Engpass: Männer 35–47 mit Zeit am Mittwoch, Donnerstag oder Freitag. Mit den Regeln aus `matching-core.ts` geprüft:
  Aus den Wartenden entsteht kein Tisch; ein einziger Mann (37–47 mit Mittwoch, 36–47 mit Donnerstag oder 34–45 mit
  Freitag) würde reichen. Zweiter Engpass: Für die drei Frauen 45–49 fehlen Männer 42–55 (keine eigene Werbung für 50+).
- Ergebnisse: Alle Versuche laufen erst seit 28.10. – zu früh. Erste Auswertung am 12.11.; die Herkunft wird erfasst (3 von 3).
- Neu umgesetzt: `llms.txt` für KI-Suche; genauerer Hinweis beim Einladungslink (Mi/Do/Fr). Heute ab 9 Uhr: Aufruf an
  die wartenden Frauen.
- Dieselbe Bitte an die 6 wartenden Männer („Bring einen Freund zwischen 35 und 47 mit“) – vom Inhaber am 29.10. freigegeben,
  läuft als Aufruf `freund-35-47`.

## Woche bis 28.10.2026 (Ausgangslage)

- Bewerbungen seit Start (22.10.): 23 angelegt, 22 abgeschickt; Tage: 2 · 7 · 1 · 4 · 5 · 4.
- Laut Inhaber dazu Anfragen über Instagram – zusammen mehr als 50 (so in der Presse).
- Wartend: 13 Frauen, 7 Männer (1 Mann pausiert). Neue Frauen kommen auf die Warteliste, solange 4 Frauen mehr als Männer angenommen sind.
- Engpass: Männer zwischen 35 und 48; bei den Jüngeren fehlte eine Frau Ende 20.
- Erster Tisch: am 28.10. geplant, Dinner am 5.11. (3 Frauen, 3 Männer, 25–30), Zusage bis 30.10.
- Herkunft: erfasst ab 28.10., noch keine Zahlen.

### Presse-Versand am 28.10.2026

Von info@tisch6.at über Resend, je Redaktion eine eigene Mail (Anschreiben + Pressetext), alle 13 laut Resend zugestellt.
Adressen aus dem Impressum bzw. der Kontaktseite des Mediums (über die Websuche gelesen, nur Treffer von der eigenen Website).
Antworten kommen im Postfach info@tisch6.at an.

| Medium | Adresse |
| --- | --- |
| 1000things | redaktion@1000thingsmagazine.com |
| STADTBEKANNT | office@stadtbekannt.at |
| VIENNA.AT | redaktion@vienna.at |
| MeinBezirk Wien | redaktion.wien@meinbezirk.at |
| DER STANDARD | redaktion@derstandard.at |
| WIENERIN | office@wienerin.at |
| WOMAN | redaktion@woman.at, online@woman.at |
| FALTER | redaktion@falter.at |
| Falstaff | redaktion@falstaff.at |
| Radio Wien / „Wien heute“ | radiowien@orf.at |
| Ö3 | hitradio@oe3.at |
| W24 | redaktion@w24.at |
| PULS 4 („Café Puls“) | contact@prosiebensat1puls4.com (allgemeine Adresse aus dem Impressum) |

Noch ohne Mail: Krone, Kurier, Die Presse (sperren KI-Werkzeuge), Heute und Kronehit (Adresse im Impressum verschleiert),
biber (nicht gefunden). Nur mit Adresse vom Inhaber nachschicken. Metropole erscheint nicht mehr.
Nachfassen nur nach Rückfrage beim Inhaber – Aufhänger wäre der erste Abend am 5.11.
