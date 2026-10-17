import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

export default function Datenschutz() {
  return (
    <LegalPage title="Datenschutzerklärung" updated="17. Oktober 2026">
      <p>
        Der Schutz deiner Daten ist uns wichtig. Hier erklären wir, welche Daten Tisch6 verarbeitet, wofür und welche Rechte du hast. Wir verarbeiten
        personenbezogene Daten ausschließlich auf Grundlage der Datenschutz-Grundverordnung (DSGVO) und des österreichischen Datenschutzgesetzes (DSG).
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>
        <Todo>Name / Firma, Anschrift</Todo>, E-Mail: <Todo>datenschutz@tisch6.at</Todo>. Siehe auch das Impressum.
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <ul>
        <li>Bewerbungsdaten: Vorname, E-Mail-Adresse, Handynummer (zur Verifizierung per SMS-Code und für Erinnerungen vor dem Dinner).</li>
        <li>Angaben aus dem Kennenlern-Chat: Alter, Geschlecht, wen du kennenlernen möchtest, gewünschte Altersspanne, Lebensstil (Rauchen, Kinder/Kinderwunsch, Beruf grob, Ausgehverhalten, Essensvorlieben, Ernährungsform und Unverträglichkeiten) sowie deine Antworten auf Situationsfragen zur Persönlichkeit.</li>
        <li>Ein daraus abgeleitetes Profil (Persönlichkeitstyp auf vier Achsen, Gesprächsthemen), das ausschließlich zur Tischzusammenstellung und für die Eisbrecher-Karte dient.</li>
        <li>Bei „Bring eine Freundin mit“: die Verknüpfung mit der Person, über deren Einladungslink du dich beworben hast.</li>
        <li>Nach dem Dinner: deine anonymen Wiedersehen-Angaben und dein freiwilliges Feedback.</li>
        <li>Teilnahmen, Absagen und Nichterscheinen sowie Zahlungsinformationen (die Zahlungsdaten selbst verarbeitet nur Stripe).</li>
        <li>Zeitpunkt und Version deiner Einwilligungen.</li>
        <li>Technisch notwendige Daten (Login-Cookies zur Sitzungsverwaltung, Server-Protokolle mit IP-Adresse).</li>
      </ul>

      <h2>3. Zwecke und Rechtsgrundlagen</h2>
      <ul>
        <li>Prüfung deiner Bewerbung und Zusammenstellung passender Tische – Art. 6 Abs. 1 lit. a und b DSGVO (Einwilligung, Vertragsanbahnung).</li>
        <li>Angaben, aus denen sich deine sexuelle Orientierung ergeben kann (wen du kennenlernen möchtest), sowie Unverträglichkeiten (Gesundheitsdaten) verarbeiten wir nur mit deiner ausdrücklichen Einwilligung – Art. 9 Abs. 2 lit. a DSGVO.</li>
        <li>Verifizierung per SMS zum Schutz aller Teilnehmer vor Fake-Profilen – Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Sicherheit).</li>
        <li>Einladungen, Erinnerungen (drei Tage, einen Tag und zwei Stunden vor dem Dinner), Nachrücker-Angebote, Wiedersehen-Abfrage und Folgeeinladungen per E-Mail und SMS – Art. 6 Abs. 1 lit. b DSGVO. Folgeeinladungen werden seltener, wenn du nicht buchst (nach zweimaligem Nichtbuchen höchstens einmal im Monat), und lassen sich jederzeit abbestellen.</li>
        <li>Feedback nach dem Dinner zur Verbesserung der Tischzusammenstellung – Art. 6 Abs. 1 lit. f DSGVO.</li>
        <li>Technischer Betrieb und Sicherheit der Website – Art. 6 Abs. 1 lit. f DSGVO.</li>
      </ul>

      <h2>4. Einsatz von künstlicher Intelligenz</h2>
      <p>
        Der Kennenlern-Chat wird von einem KI-Sprachmodell (Claude von Anthropic) geführt. Deine Antworten werden an Anthropic übermittelt, um die nächste
        Frage zu formulieren und am Ende ein strukturiertes Profil zu erstellen. Die KI unterstützt bei der Zusammenstellung von Tischen; eine
        Bewerbung kann automatisiert angenommen oder auf die Warteliste gesetzt werden. Du kannst jederzeit verlangen, dass eine Entscheidung von
        einem Menschen überprüft wird (Art. 22 Abs. 3 DSGVO) – schreib uns einfach.
      </p>

      <h2>5. Empfänger und Auftragsverarbeiter</h2>
      <ul>
        <li>Supabase Inc. – Datenbank und Login, Serverstandort EU (Frankfurt).</li>
        <li>Vercel Inc. – Hosting der Website (USA; Datenübermittlung auf Grundlage des EU-US Data Privacy Framework bzw. Standardvertragsklauseln).</li>
        <li>Anthropic PBC – KI-Kennenlern-Chat (USA; Standardvertragsklauseln). Daten werden laut Anthropic nicht zum Training von Modellen verwendet.</li>
        <li><Todo>SMS-Anbieter, z. B. Twilio Inc.</Todo> – Versand von Bestätigungscode, Erinnerungen und Nachrücker-Angeboten.</li>
        <li>Ab Einführung der Einladungen: Resend (E-Mail-Versand) und Stripe (Zahlungsabwicklung).</li>
      </ul>
      <p>Andere Gäste sehen deine Chat-Antworten und dein Profil nicht. Kontaktdaten werden nur bei gegenseitigem Wiedersehen-Wunsch geteilt.</p>

      <h2>6. Speicherdauer</h2>
      <p>
        Wir speichern deine Daten, solange du ein Profil bei Tisch6 hast. Du kannst dein Profil jederzeit unter „Mein Konto“ selbst endgültig löschen.
        Gesetzliche Aufbewahrungspflichten (z. B. für Rechnungen, 7 Jahre) bleiben unberührt.
      </p>

      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht,
        erteilte Einwilligungen jederzeit mit Wirkung für die Zukunft zu widerrufen. Wende dich dazu an <Todo>datenschutz@tisch6.at</Todo>. Du kannst dich
        außerdem bei der Österreichischen Datenschutzbehörde beschweren (<a href="https://www.dsb.gv.at">www.dsb.gv.at</a>).
      </p>

      <h2>8. Cookies</h2>
      <p>Wir verwenden ausschließlich technisch notwendige Cookies für den Login. Es gibt kein Tracking und keine Werbe-Cookies.</p>
    </LegalPage>
  );
}
