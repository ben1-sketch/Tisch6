import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/LegalPage";

export const metadata: Metadata = { title: "AGB" };

export default function Agb() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen" updated="17. Oktober 2026">
      <h2>1. Geltungsbereich</h2>
      <p>Diese AGB gelten für die Nutzung von Tisch6 (tisch6.at), betrieben von <Todo>Name / Firma laut Impressum</Todo>, und die Teilnahme an Tisch6-Dinnern.</p>

      <h2>2. Leistung</h2>
      <p>
        Tisch6 stellt mithilfe künstlicher Intelligenz Tischgruppen von sechs Singles zusammen und organisiert Dinner in Partnerrestaurants. Tisch6
        schuldet keinen Erfolg im Sinne einer Partnerschaft und keine bestimmte Tischbesetzung.
      </p>

      <h2>3. Bewerbung und Teilnahme</h2>
      <ul>
        <li>Teilnehmen können Singles ab 18 Jahren. Die Bewerbung ist kostenlos und begründet keinen Anspruch auf eine Einladung.</li>
        <li>Die Angaben in der Bewerbung müssen wahrheitsgemäß sein. Falsche Angaben berechtigen zum Ausschluss.</li>
        <li>Pro Person ist nur ein Profil erlaubt; die Handynummer wird per SMS-Code verifiziert.</li>
      </ul>

      <h2>4. Einladung, Preis und Zahlung</h2>
      <ul>
        <li>Angenommene Bewerber erhalten Einladungen zu konkreten Dinnern per E-Mail. Preis, Datum und Restaurant stehen in der Einladung.</li>
        <li>Der Platz ist erst nach vollständiger Zahlung über unseren Zahlungsanbieter verbindlich reserviert. Bis dahin kann der Platz anderweitig vergeben werden.</li>
        <li>Der Preis umfasst <Todo>z. B. Organisation / Menü / Getränke – festlegen</Todo>. Speisen und Getränke außerhalb des Pakets werden direkt im Restaurant bezahlt.</li>
      </ul>

      <h2>5. Absagen und Nachrücker</h2>
      <ul>
        <li>Absage bis <Todo>72</Todo> Stunden vor dem Dinner: Gutschrift für ein späteres Dinner <Todo>oder Rückerstattung</Todo>.</li>
        <li>Spätere Absage oder Nichterscheinen: keine Rückerstattung, außer jemand von der Warteliste übernimmt den Platz.</li>
        <li>Kommt ein Tisch mangels passender Teilnehmer nicht zustande, wird der Termin verschoben. Du kannst dann einen neuen Termin wählen oder erhältst den vollen Betrag zurück.</li>
      </ul>

      <h2>6. Rücktrittsrecht</h2>
      <p>
        Bei Dienstleistungen im Zusammenhang mit Freizeitbetätigungen, die zu einem bestimmten Termin erbracht werden, besteht gemäß § 18 Abs. 1 Z 10
        FAGG kein Rücktrittsrecht. <Todo>Rechtlich prüfen lassen</Todo>
      </p>

      <h2>7. Verhalten</h2>
      <p>Wir erwarten respektvolles Verhalten gegenüber allen Gästen und dem Restaurant. Bei Belästigung oder grobem Fehlverhalten wird die Person dauerhaft ausgeschlossen.</p>

      <h2>8. Wiedersehen-Funktion</h2>
      <p>Nach dem Dinner kannst du anonym angeben, wen du wiedersehen möchtest. Kontaktdaten werden ausschließlich bei gegenseitigem Interesse geteilt.</p>

      <h2>9. Haftung</h2>
      <p>Tisch6 haftet nur für Vorsatz und grobe Fahrlässigkeit; dies gilt nicht für Personenschäden. Für Leistungen der Restaurants haftet das jeweilige Restaurant.</p>

      <h2>10. Schlussbestimmungen</h2>
      <p>Es gilt österreichisches Recht unter Ausschluss der Verweisungsnormen. Zwingende Verbraucherschutzbestimmungen bleiben unberührt.</p>

      <p className="!mt-10 !text-sm">Hinweis: Entwurf – vor dem Livegang juristisch prüfen lassen.</p>
    </LegalPage>
  );
}
