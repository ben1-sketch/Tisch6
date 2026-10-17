import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <LegalPage title="Impressum" updated="17. Oktober 2026">
      <p>Informationspflicht laut § 5 E-Commerce-Gesetz, § 14 Unternehmensgesetzbuch, § 63 Gewerbeordnung und Offenlegungspflicht laut § 25 Mediengesetz.</p>

      <h2>Medieninhaber und Betreiber</h2>
      <p>
        <Todo>Vor- und Nachname bzw. Firmenname</Todo>
        <br />
        <Todo>Straße und Hausnummer</Todo>
        <br />
        <Todo>PLZ</Todo> Wien, Österreich
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <Todo>hallo@tisch6.at</Todo>
        <br />
        Telefon: <Todo>+43 …</Todo>
      </p>

      <h2>Unternehmensdaten</h2>
      <ul>
        <li>Unternehmensgegenstand: Organisation kuratierter Dinner-Veranstaltungen für Singles</li>
        <li>UID-Nummer: <Todo>ATU… – falls vorhanden</Todo></li>
        <li>Firmenbuchnummer / Firmenbuchgericht: <Todo>falls eingetragen</Todo></li>
        <li>Gewerbe und Gewerbebehörde: <Todo>laut Gewerbeschein, z. B. Magistratisches Bezirksamt</Todo></li>
        <li>Mitglied der Wirtschaftskammer Wien: <Todo>Fachgruppe</Todo></li>
        <li>Anwendbare Rechtsvorschriften: Gewerbeordnung, abrufbar unter <a href="https://www.ris.bka.gv.at">www.ris.bka.gv.at</a></li>
      </ul>

      <h2>Blattlinie</h2>
      <p>Informationen über das Angebot von Tisch6 – KI-kuratierte Dating-Dinner.</p>

      <h2>Online-Streitbeilegung</h2>
      <p>
        Verbraucher haben die Möglichkeit, Beschwerden an die Online-Streitbeilegungsplattform der EU zu richten:{" "}
        <a href="https://ec.europa.eu/odr">ec.europa.eu/odr</a>. Sie können allfällige Beschwerden auch an die oben angegebene E-Mail-Adresse richten.
      </p>
    </LegalPage>
  );
}
