import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Impressum" };

export default function Impressum() {
  return (
    <LegalPage title="Impressum" updated="20. Oktober 2026">
      <p>Informationspflicht laut § 5 E-Commerce-Gesetz und Offenlegungspflicht laut § 25 Mediengesetz.</p>

      <h2>Medieninhaber und Betreiber</h2>
      <p>
        Tisch6 (Einzelunternehmen)
        <br />
        Wien, Österreich
      </p>

      <h2>Kontakt</h2>
      <p>
        Tisch6-Team
        <br />
        E-Mail: <a href="mailto:hallo@tisch6.at">hallo@tisch6.at</a>
      </p>

      <h2>Unternehmensgegenstand</h2>
      <p>Organisation kuratierter Dinner-Veranstaltungen für Singles.</p>

      <h2>Blattlinie</h2>
      <p>Informationen über das Angebot von Tisch6 – KI-kuratierte Dating-Dinner.</p>

      <h2>Beschwerden</h2>
      <p>
        Anliegen und Beschwerden kannst du jederzeit an <a href="mailto:hallo@tisch6.at">hallo@tisch6.at</a> richten – hier antwortet ein Mensch.
      </p>
    </LegalPage>
  );
}
