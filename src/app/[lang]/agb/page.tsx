import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "AGB" };

export default function Agb() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen" updated="20. Oktober 2026">
      <h2>1. Geltungsbereich</h2>
      <p>Diese AGB gelten für die Nutzung von Tisch6 (tisch6.at), betrieben von Arben Murseli e.U., Wienerstraße 5b, 3500 Krems an der Donau (siehe Impressum), und die Teilnahme an Tisch6-Dinnern.</p>

      <h2>2. Leistung</h2>
      <p>
        Tisch6 stellt mithilfe künstlicher Intelligenz Tischgruppen von sechs Singles (drei Frauen, drei Männer) zusammen und organisiert Dinner in Wiener Partnerlokalen. Tisch6
        schuldet keinen Erfolg im Sinne einer Partnerschaft und keine bestimmte Tischbesetzung.
      </p>

      <h2>3. Bewerbung und Teilnahme</h2>
      <ul>
        <li>Teilnehmen können Singles ab 18 Jahren. Die Bewerbung ist kostenlos und begründet keinen Anspruch auf eine Einladung.</li>
        <li>Über die Bewerbung wird automatisiert innerhalb von 24 Stunden entschieden (angenommen, abgelehnt oder – für ein ausgewogenes Verhältnis von Frauen und Männern – Warteliste). In Zweifelsfällen prüft ein Mensch. Abgelehnte Bewerbungen werden nach 30 Tagen gelöscht.</li>
        <li>Die Angaben in der Bewerbung müssen wahrheitsgemäß sein. Falsche Angaben berechtigen zum Ausschluss.</li>
        <li>Pro Person ist nur ein Profil erlaubt. Zur Verifizierung sind eine per SMS-Code bestätigte Handynummer und genau ein aktuelles Foto erforderlich. Das Foto dient ausschließlich der Prüfung durch Tisch6 und wird anderen Teilnehmern nie gezeigt.</li>
        <li>„Bring eine Freundin mit“: Wer sich über den Einladungslink einer anderen Person bewirbt, wird mit ihr verknüpft. Beide werden nach Möglichkeit zum selben Termin, aber stets an verschiedene Tische eingeladen. Jede Person bewirbt sich und zahlt selbst.</li>
      </ul>

      <h2>4. Tischteilnahme, Preise und Zahlung</h2>
      <ul>
        <li>Dinner finden an den Abenden statt, an denen die Partnerlokale einen Tisch für Tisch6 bereithalten. Tisch6 stellt die Tische automatisch zusammen und legt den Termin fest, sobald ein passender Tisch beisammen ist; dabei werden die angegebenen Wunschtage berücksichtigt. Angenommene Personen erhalten per E-Mail eine Einladung zu dieser konkreten Tischteilnahme (Datum, Uhrzeit, Partnerlokal).</li>
        <li>Eine Tischteilnahme kostet 38 Euro. Sie umfasst den Platz an einem kuratierten Tisch, die Gesprächskarte und die Wiedersehen-Funktion. Speisen und Getränke bezahlen die Gäste selbst im Lokal; die Partnerlokale teilen die Rechnung dabei gleichmäßig auf alle Gäste des Tisches auf. Es gibt keine weiteren Kosten.</li>
        <li>Eine Einladung gilt 48 Stunden, längstens bis 25 Stunden vor Beginn. Der Platz ist erst nach vollständiger Zahlung über unseren Zahlungsanbieter (Stripe) verbindlich reserviert. Bis dahin kann der Platz anderweitig vergeben werden. Geht eine Zahlung ein, nachdem der Platz bereits vergeben wurde, wird sie automatisch erstattet.</li>
        <li>Gründungsangebot „Gründungsmitglied Tisch6“: Für die ersten 300 Käuferinnen und Käufer in Wien gibt es drei Tischteilnahmen im Paket für 79 Euro statt 114 Euro. Das Paket ist ab Kauf zwölf Monate gültig; nicht genutzte Tischteilnahmen verfallen danach. Das Paket ist persönlich und nicht übertragbar. Käufer erhalten das Abzeichen „Gründungsmitglied“ im Profil.</li>
      </ul>

      <h2>5. Empfehlungsprogramm</h2>
      <ul>
        <li>Jede Person erhält einen persönlichen Einladungslink.</li>
        <li>Wird eine über diesen Link eingeladene Person angenommen und nimmt sie an einem Dinner teil, kostet die nächste Tischteilnahme der einladenden Person 20 Euro statt 38 Euro. Der Rabatt wird automatisch bei der nächsten Einladung verrechnet, ist nicht auszahlbar und nicht mit dem Gründungspaket kombinierbar.</li>
        <li>Mehrfachprofile oder Selbsteinladungen führen zum Verlust aller Rabatte und zum Ausschluss.</li>
      </ul>

      <h2>6. Absagen, Nachrücker und Nichterscheinen</h2>
      <ul>
        <li>Absage bis 48 Stunden vor Beginn: kostenlos. Die Gebühr wird erstattet bzw. die Tischteilnahme dem Guthaben wieder gutgeschrieben. Der Platz geht automatisch an die erste passende Person auf der Warteliste.</li>
        <li>Nachrücker werden per E-Mail und SMS benachrichtigt und haben zwölf Stunden Zeit, zuzusagen und zu bezahlen. Danach geht das Angebot an die nächste passende Person.</li>
        <li>Absage weniger als 48 Stunden vor Beginn: Die Gebühr verfällt.</li>
        <li>Nichterscheinen ohne Absage: Die Gebühr verfällt. Beim zweiten Nichterscheinen ohne Absage wird das Profil gesperrt.</li>
        <li>Als nicht erschienen gilt, wer von mindestens zwei anderen Gästen des Tisches im Feedback als abwesend angegeben wird.</li>
        <li>Ab fünf bestätigten Personen findet der Tisch statt. Fällt kurzfristig eine Person aus, findet das Dinner mit fünf Personen statt. Alle Anwesenden erhalten einen Rabatt auf ihre nächste Tischteilnahme (25 Euro statt 38 Euro).</li>
        <li>Sind 24 Stunden vor Beginn weniger als fünf Personen bestätigt, wird der Tisch automatisch abgesagt; alle werden per E-Mail und SMS informiert. Bereits bezahlte Tischteilnahmen bleiben als Guthaben für die nächste Einladung erhalten (zwölf Monate gültig). Auf Wunsch erstatten wir den bezahlten Betrag stattdessen zurück.</li>
        <li>Muss Tisch6 einen Tisch verschieben oder absagen, werden alle Teilnehmenden sofort per E-Mail und SMS informiert. Nach einer Verschiebung kann jede Person, die den neuen Termin nicht wahrnehmen kann, kostenlos absagen.</li>
      </ul>

      <h2>7. Rücktrittsrecht</h2>
      <p>
        Bei Dienstleistungen im Zusammenhang mit Freizeitbetätigungen, die zu einem bestimmten Termin erbracht werden, besteht gemäß § 18 Abs. 1 Z 10
        FAGG kein Rücktrittsrecht. Für das Gründungspaket ohne festen Termin gilt das gesetzliche Rücktrittsrecht von 14 Tagen.
      </p>

      <h2>8. Verhalten</h2>
      <p>Wir erwarten respektvolles Verhalten gegenüber allen Gästen und dem Lokal. Wer sich unwohl fühlt, kann während oder nach dem Dinner über den Meldeknopf im Profil eine Person melden; am Tag des Tisches erhalten alle Gäste zudem eine Notfallnummer per SMS. Tisch6 prüft jede Meldung und sperrt das Profil bei Bedarf, bei Belästigung oder grobem Fehlverhalten dauerhaft. Die gemeldete Person erfährt nicht, wer gemeldet hat.</p>

      <h2>9. Nach dem Dinner</h2>
      <p>
        Am Tag nach dem Dinner kannst du anonym angeben, wen du wiedersehen möchtest. Kontaktdaten werden ausschließlich bei gegenseitigem Interesse
        geteilt: Beide erhalten die E-Mail-Adresse der anderen Person, die Handynummer nur, wenn diese der Weitergabe zugestimmt hat. Ein kurzes
        Feedback ist freiwillig. Ohne Match erhältst du am dritten Tag eine Einladung zum nächsten Termin; bleibt sie zweimal unbeantwortet, erinnern
        wir höchstens noch einmal im Monat. Einladungen lassen sich im Konto jederzeit pausieren.
      </p>

      <h2>10. Haftung</h2>
      <p>Tisch6 haftet nur für Vorsatz und grobe Fahrlässigkeit; dies gilt nicht für Personenschäden. Für Leistungen der Lokale (Speisen, Getränke, Service) haftet das jeweilige Lokal.</p>

      <h2>11. Schlussbestimmungen</h2>
      <p>Es gilt österreichisches Recht unter Ausschluss der Verweisungsnormen. Zwingende Verbraucherschutzbestimmungen bleiben unberührt.</p>

      <p className="!mt-10 !text-sm">Hinweis: Entwurf – vor dem Livegang juristisch prüfen lassen.</p>
    </LegalPage>
  );
}
