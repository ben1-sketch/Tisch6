import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <LegalPage title="Impressum" updated="20. Oktober 2026">
      <p>
        Informationspflicht laut §&nbsp;5 E-Commerce-Gesetz, §&nbsp;14 Unternehmensgesetzbuch und §&nbsp;63 Gewerbeordnung sowie Offenlegungspflicht laut
        §&nbsp;25 Mediengesetz.
      </p>

      <h2>Medieninhaber und Betreiber</h2>
      <p>
        Arben Murseli e.U. (Einzelunternehmen)
        <br />
        Marke: Tisch6
        <br />
        Wienerstraße 5b, 3500 Krems an der Donau, Österreich
      </p>

      <h2>Firmendaten</h2>
      <p>
        Firmensitz: Krems an der Donau
        <br />
        Firmenbuchnummer: FN 452345p
        <br />
        Firmenbuchgericht: Landesgericht Krems an der Donau
        <br />
        UID-Nummer: ATU70958706
      </p>

      <h2>Kontakt</h2>
      <p>
        Tisch6-Team
        <br />
        E-Mail: <a href="mailto:info@tisch6.at">info@tisch6.at</a>
      </p>

      <h2>Gewerberecht</h2>
      <p>
        Mitglied der Wirtschaftskammer Niederösterreich
        <br />
        Gewerbebehörde: Magistrat der Stadt Krems an der Donau
        <br />
        Anwendbare Vorschrift: Gewerbeordnung, abrufbar unter <a href="https://www.ris.bka.gv.at">www.ris.bka.gv.at</a>
      </p>

      <h2>Unternehmensgegenstand</h2>
      <p>Organisation kuratierter Dinner-Veranstaltungen für Singles.</p>

      <h2>Blattlinie</h2>
      <p>Informationen über das Angebot von Tisch6 – KI-kuratierte Dating-Dinner.</p>

      <h2>Beschwerden</h2>
      <p>
        Anliegen und Beschwerden kannst du jederzeit an <a href="mailto:info@tisch6.at">info@tisch6.at</a> richten – hier antwortet ein Mensch.
      </p>
    </LegalPage>
  );
}
