import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung" updated="28. Oktober 2026">
      <p>
        Der Schutz deiner Daten ist uns wichtig. Hier erklären wir, welche Daten Tisch6 verarbeitet, wofür und welche Rechte du hast. Wir verarbeiten
        personenbezogene Daten ausschließlich auf Grundlage der Datenschutz-Grundverordnung (DSGVO) und des österreichischen Datenschutzgesetzes (DSG).
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Arben Murseli e.U. (Marke Tisch6), Wienerstraße 5b, 3500 Krems an der Donau, Österreich, E-Mail:{" "}
        <a href="mailto:info@tisch6.at">info@tisch6.at</a>. Siehe auch das Impressum.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Bewerbungsdaten: Vorname, E-Mail-Adresse, Handynummer (zur Verifizierung per SMS-Code und für Erinnerungen vor dem Dinner).</li>
        <li>Ein Verifizierungsfoto. Es wird bereits in deinem Browser verkleinert und von Metadaten (z. B. Standort) befreit, auf unserem Server mit AES-256 verschlüsselt und in einem privaten Speicher in der EU abgelegt. Nur das Tisch6-Team kann es zur Prüfung entschlüsseln; andere Teilnehmer sehen es nie. Es wird nicht biometrisch ausgewertet.</li>
        <li>Angaben aus dem Kennenlern-Chat: Alter, Geschlecht, wen du kennenlernen möchtest, gewünschte Altersspanne, Wunschtage für Dinner, Lebensstil (Rauchen, Kinder/Kinderwunsch, Beruf grob, Ausgehverhalten, Essensvorlieben, Ernährungsform und Unverträglichkeiten) sowie deine Antworten auf Situationsfragen zur Persönlichkeit.</li>
        <li>Dein Beziehungsziel (ernsthafte Beziehung oder erstmal schauen) und grob, wie wichtig dir Glaube, Politik und Familie sind. Angaben zu Glaube und Politik sind besondere Kategorien personenbezogener Daten; wir verarbeiten sie nur mit deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a DSGVO), nur für das Matching, und zeigen sie nirgends an – weder anderen Gästen noch auf der Website.</li>
        <li>Ein daraus abgeleitetes Profil (Persönlichkeitstyp auf vier Achsen, Gesprächsthemen), das ausschließlich zur Tischzusammenstellung und für die Gesprächskarte dient.</li>
        <li>Wenn du dich über einen Einladungslink bewirbst: wer dich eingeladen hat (für das Empfehlungsprogramm) und – bei „Bring eine Freundin oder einen Freund mit“ – die Verknüpfung als Duo.</li>
        <li>Meldungen über das Verhalten am Tisch: wer wen wann gemeldet hat und die Beschreibung. Die gemeldete Person erfährt nicht, wer gemeldet hat.</li>
        <li>Nach dem Dinner: deine anonymen Wiedersehen-Angaben und dein freiwilliges Feedback. Für das lernende Matching merken wir uns daraus, welche Persönlichkeitstypen jemand wiedersehen wollte – nur als Typ, ohne Namen; wird ein Profil gelöscht, bleibt für die anderen nur dieser anonyme Typ.</li>
        <li>Freiwillig: dein Satz „Wie war der Abend?“ samt der Angabe, ob wir ihn ohne Namen zitieren dürfen.</li>
        <li>Freiwillig: wie du von Tisch6 erfahren hast (z. B. Instagram, Google, Empfehlung) sowie, ob du über einen Werbelink gekommen bist.</li>
        <li>Teilnahmen, Absagen und Nichterscheinen sowie Zahlungsinformationen (die Zahlungsdaten selbst verarbeitet nur Stripe).</li>
        <li>Interne Vermerke des Tisch6-Teams, z. B. zur Prüfung einer Meldung, zu Gutschriften oder zu Absprachen mit dir. Eingriffe des Teams werden ohne Namen protokolliert.</li>
        <li>Zeitpunkt und Version deiner Einwilligungen.</li>
        <li>Technisch notwendige Daten (Login-Cookies zur Sitzungsverwaltung, Server-Protokolle mit IP-Adresse).</li>
      </ul>

      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <ul>
        <li>Prüfung deiner Bewerbung und Zusammenstellung passender Tische – Art. 6 Abs. 1 lit. a und b DSGVO (Einwilligung, Vertragsanbahnung).</li>
        <li>Angaben, aus denen sich deine sexuelle Orientierung ergeben kann (wen du kennenlernen möchtest), sowie Unverträglichkeiten (Gesundheitsdaten) verarbeiten wir nur mit deiner ausdrücklichen Einwilligung – Art. 9 Abs. 2 lit. a DSGVO.</li>
        <li>Verifizierung per SMS und Foto sowie die Bearbeitung von Meldungen zum Schutz aller Teilnehmer vor Fake-Profilen und Fehlverhalten – Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Sicherheit).</li>
        <li>Eingangsbestätigung und Antwort auf die Bewerbung, höchstens zwei Erinnerungen an eine angefangene, nicht abgeschlossene Bewerbung, Einladungen und eine Erinnerung, solange eine Einladung noch offen ist, ein Lebenszeichen nach sieben Tagen ohne Tisch, Erinnerungen (drei Tage, einen Tag und zwei Stunden vor dem Dinner), die Gesprächskarte und eine Notfallnummer am Tag des Tisches, Nachrücker-Angebote, Nachrichten bei Verschiebung oder Absage, Wiedersehen-Abfrage und Folgeeinladungen per E-Mail und SMS – Art. 6 Abs. 1 lit. b DSGVO. Folgeeinladungen werden seltener, wenn du nicht buchst (nach zweimaligem Nichtbuchen höchstens einmal im Monat), und lassen sich jederzeit abbestellen.</li>
        <li>Feedback nach dem Dinner zur Verbesserung der Tischzusammenstellung – Art. 6 Abs. 1 lit. f DSGVO.</li>
        <li>Zitate ohne Namen auf Instagram und tisch6.at – nur mit deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Du kannst sie jederzeit auf deiner Feedbackseite oder per E-Mail an info@tisch6.at widerrufen; wir löschen dann die betroffenen Beiträge. Fotos von Gästen veröffentlichen wir nie.</li>
        <li>Auswertung, über welche Wege Bewerbungen zu uns kommen, damit wir Werbung gezielt einsetzen – Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse); ausgewertet wird nur in Summen.</li>
        <li>Technischer Betrieb und Sicherheit der Website – Art. 6 Abs. 1 lit. f DSGVO.</li>
      </ul>

      <h2>4. Einsatz von künstlicher Intelligenz</h2>
      <p>
        Der Kennenlern-Chat wird von einem KI-Sprachmodell (Claude von Anthropic) geführt. Deine Antworten werden an Anthropic übermittelt, um die nächste
        Frage zu formulieren und am Ende ein strukturiertes Profil zu erstellen. Für die Prüfung der Bewerbung, die Zusammenstellung der Tische
        (einschließlich Beziehungsziel, Werten und der anonymen Wiedersehen-Historie) und die Gesprächskarten erhält die KI Profilangaben ohne Namen
        und Kontaktdaten. Eine Bewerbung kann automatisiert angenommen, abgelehnt oder auf die Warteliste gesetzt werden; dabei achten wir auch auf
        ein ausgewogenes Verhältnis von Frauen und Männern, in Zweifelsfällen entscheidet ein Mensch. Du kannst jederzeit verlangen, dass eine
        Entscheidung von einem Menschen überprüft wird (Art. 22 Abs. 3 DSGVO) – schreib uns einfach.
      </p>

      <h2>5. Speicherung des Fotos</h2>
      <p>
        Das Verifizierungsfoto speichern wir, solange dein Profil besteht, damit wir bei Meldungen erneut prüfen können. Beim Löschen deines Profils
        wird es sofort mitgelöscht.
      </p>

      <h2>6. Empfänger und Auftragsverarbeiter</h2>
      <ul>
        <li>Supabase Inc. – Datenbank, Login und verschlüsselter Fotospeicher, Serverstandort EU (Irland).</li>
        <li>Vercel Inc. – Hosting der Website (USA; Datenübermittlung auf Grundlage des EU-US Data Privacy Framework bzw. Standardvertragsklauseln).</li>
        <li>Anthropic PBC – KI-Kennenlern-Chat (USA; Standardvertragsklauseln). Daten werden laut Anthropic nicht zum Training von Modellen verwendet.</li>
        <li>
          Twilio Ireland Ltd. (Irland) – Versand von Bestätigungscode, Erinnerungen und Nachrücker-Angeboten; Verarbeitung auch durch Twilio Inc.
          (USA; EU-US Data Privacy Framework bzw. Standardvertragsklauseln).
        </li>
        <li>Resend Inc. – Versand von E-Mails (USA; EU-US Data Privacy Framework bzw. Standardvertragsklauseln).</li>
        <li>Stripe Payments Europe Ltd. (Irland) – Zahlungsabwicklung. Karten- und Kontodaten gibst du direkt bei Stripe ein; wir erhalten sie nicht.</li>
        <li>Unsere Partnerlokale – erhalten für die Reservierung auf den Namen „Tisch6“ nur die Personenzahl und anonyme Hinweise für die Küche (z. B. „1× vegetarisch“), keine Namen.</li>
      </ul>
      <p>
        Andere Gäste sehen deine Chat-Antworten und dein Profil nicht – am Abend nur deinen Vornamen. Kontaktdaten werden nur bei gegenseitigem
        Wiedersehen-Wunsch geteilt: deine E-Mail-Adresse und, wenn du zustimmst, deine Handynummer.
      </p>

      <h2>7. Speicherdauer</h2>
      <p>
        Wir speichern deine Daten, solange du ein Profil bei Tisch6 hast. Du kannst dein Profil jederzeit unter „Mein Konto“ selbst endgültig löschen –
        dabei werden auch Foto, Chat, Feedback und Wiedersehen-Angaben gelöscht und offene Einladungen abgesagt. Zahlungsbelege bewahren wir wegen
        gesetzlicher Pflichten 7 Jahre auf, getrennt von deinem Profil. Abgelehnte Bewerbungen löschen wir nach 30 Tagen, Bewerbungen von Personen
        unter 18 Jahren sofort.
      </p>

      <h2>8. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht,
        erteilte Einwilligungen jederzeit mit Wirkung für die Zukunft zu widerrufen. Wende dich dazu an <a href="mailto:info@tisch6.at">info@tisch6.at</a>. Du kannst dich
        außerdem bei der Österreichischen Datenschutzbehörde beschweren (<a href="https://www.dsb.gv.at">www.dsb.gv.at</a>).
      </p>

      <h2>9. Cookies</h2>
      <p>Wir verwenden ausschließlich technisch notwendige Cookies für den Login. Es gibt kein Tracking und keine Werbe-Cookies.</p>
    </LegalPage>
  );
}
