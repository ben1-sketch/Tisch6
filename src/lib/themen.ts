/**
 * Themenseiten für Google: je ein Suchbegriff, mit echtem Inhalt zu Tisch6.
 * Nur Aussagen, die stimmen – Preise und Regeln wie in lib/config.ts. {tage} = aktuelle Dinner-Tage.
 */
export type Thema = {
  slug: string;
  /** Seitentitel bei Google (ohne „· Tisch6“) */
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  lead: string;
  sections: { title: string; text?: string; points?: string[] }[];
  faq: { q: string; a: string }[];
  /** kurzer Linktext für „Mehr zum Thema“ und die Fußzeile */
  short: string;
};

export const THEMEN: Thema[] = [
  {
    slug: "dinner-dating-wien",
    short: "Dinner-Dating in Wien",
    title: "Dinner-Dating in Wien",
    description:
      "Dinner-Dating in Wien mit Tisch6: sechs Singles, ein Tisch, ein Abend in einem ausgewählten Wiener Lokal. Die Runde stellt unsere KI zusammen. Bewerbung kostenlos.",
    eyebrow: "Dinner-Dating Wien",
    h1: "Dinner-Dating in Wien: sechs Singles, ein Tisch",
    lead: "Bei Tisch6 lernst du neue Menschen nicht über ein Profilbild kennen, sondern bei einem echten Abendessen. Drei Frauen, drei Männer, ein ausgewähltes Wiener Lokal – und eine Runde, die unsere KI so zusammenstellt, dass die Gespräche von selbst laufen.",
    sections: [
      {
        title: "Was ist Dinner-Dating?",
        text: "Beim Dinner-Dating essen Singles gemeinsam an einem Tisch. Statt eines Dates zu zweit gibt es eine kleine Runde: Das nimmt den Druck raus, und du erlebst die anderen so, wie sie wirklich sind – im Gespräch, beim Lachen, beim Essen.",
      },
      {
        title: "So läuft es bei Tisch6",
        points: [
          "Du bewirbst dich kostenlos: ein kurzer Chat mit unserer KI-Gastgeberin, dazu ein SMS-Code und ein Foto, das nur unser Team sieht.",
          "Jede Nacht stellt die KI passende Tische zusammen – drei Frauen, drei Männer, höchstens zehn Jahre auseinander, an deinen Wunschtagen.",
          "Du bekommst eine Einladung per E-Mail mit Datum, Lokal und Runde. Bezahlt wird erst, wenn du zusagst.",
          "Am Abend bringt euch eine Gesprächskarte ins Reden – vom Aperitif bis zum Dessert.",
          "Am Tag danach sagst du anonym, wen du wiedersehen möchtest. Kontakt gibt es nur, wenn es beidseitig ist.",
        ],
      },
      {
        title: "Was es kostet",
        text: "Die Bewerbung ist kostenlos. Eine Tischteilnahme kostet 38 €. Für die ersten 300 in Wien gibt es das Gründungspaket: drei Abende für 79 €. Essen und Getränke zahlt jeder selbst im Lokal – jeder seine eigene Rechnung.",
      },
    ],
    faq: [
      { q: "Wo finden die Dinner statt?", a: "In ausgewählten Wiener Lokalen. Reserviert ist auf „Tisch6“, die Adresse steht in deiner Einladung." },
      { q: "Wann gibt es Tische?", a: "Tische gibt es {tage}. Welche Tage dir passen, sagst du im Kennenlern-Chat." },
      {
        q: "Muss ich allein kommen?",
        a: "Nein. Du kannst eine Freundin oder einen Freund mitbringen. Wir setzen euch möglichst an denselben Abend – an verschiedene Tische.",
      },
      {
        q: "Was, wenn es nicht funkt?",
        a: "Dann war es trotzdem ein schöner Abend. Ob du jemanden wiedersehen willst, entscheidest du am Tag danach anonym – niemand bekommt einen Korb vor anderen.",
      },
    ],
  },
  {
    slug: "singles-wien",
    short: "Singles in Wien kennenlernen",
    title: "Singles in Wien kennenlernen – ohne App",
    description:
      "Singles in Wien kennenlernen, ohne zu wischen: Bei Tisch6 sitzt du mit fünf anderen Singles an einem Tisch in einem Wiener Lokal. Kostenlos bewerben.",
    eyebrow: "Singles in Wien",
    h1: "Singles in Wien kennenlernen – ohne zu wischen",
    lead: "Dating-Apps sind praktisch, aber viele sind müde vom Wischen, von endlosen Chats und vom Ghosting. Tisch6 geht einen anderen Weg: Du triffst echte Menschen an einem Tisch – ausgewählt, geprüft und mit einem Abend, der von selbst läuft.",
    sections: [
      {
        title: "Warum es in Wien oft nicht so einfach ist",
        text: "Der Freundeskreis steht, der Job ist voll, und in Bars kommt man selten richtig ins Gespräch. Wer neue Menschen kennenlernen will, braucht einen Rahmen, in dem das leicht fällt – genau den bauen wir.",
      },
      {
        title: "Der Weg von Tisch6",
        points: [
          "Kein Wischen: Unsere KI stellt die Runde zusammen – nach Persönlichkeit, Alter, Wunschtagen und dem, was du suchst.",
          "Kein Ghosting: Ihr sitzt euch gegenüber. Ein echter Abend statt endloser Chats.",
          "Kein Druck: sechs Menschen statt Date zu zweit. Wiedersehen nur, wenn es beide wollen.",
          "Sicher: Jede Person ist mit SMS-Code und Foto geprüft, ihr trefft euch in einem öffentlichen Lokal, deine Nummer bleibt bei dir.",
        ],
      },
      {
        title: "Für wen Tisch6 ist",
        text: "Für Singles in Wien ab 18, die Lust auf echte Begegnungen haben – ob du eine Beziehung suchst oder erst einmal neue Menschen kennenlernen willst. Die KI fragt im Kennenlern-Chat danach und berücksichtigt es bei deinem Tisch.",
      },
    ],
    faq: [
      { q: "Wie viele Menschen sitzen am Tisch?", a: "Sechs: drei Frauen und drei Männer, höchstens zehn Jahre auseinander." },
      {
        q: "Wie schnell bekomme ich einen Tisch?",
        a: "Sobald fünf Menschen da sind, die gut zu dir passen. Die KI plant jede Nacht – lieber ein paar Tage warten als ein Tisch, der nicht passt.",
      },
      { q: "Was kostet es?", a: "Die Bewerbung ist kostenlos, eine Tischteilnahme kostet 38 €. Essen und Getränke zahlt jeder selbst im Lokal." },
    ],
  },
  {
    slug: "singles-ab-40-wien",
    short: "Singles ab 40 in Wien",
    title: "Singles ab 40 in Wien: Dinner statt Dating-App",
    description:
      "Für Singles ab 40 in Wien: ein entspannter Abend zu sechst mit Menschen in deinem Alter, in einem ausgewählten Lokal. Von einer KI zusammengestellt, ohne Wischen.",
    eyebrow: "Singles ab 40",
    h1: "Singles ab 40 in Wien: ein Abend unter Gleichgesinnten",
    lead: "Mit 40 plus will man niemandem mehr hinterherschreiben. Man will Menschen treffen, die zum eigenen Leben passen – bei gutem Essen und mit echten Gesprächen. Genau dafür gibt es Tisch6.",
    sections: [
      {
        title: "Warum ein Tisch statt eines Dates?",
        text: "Ein Abend zu sechst ist entspannter als ein Date zu zweit. Niemand muss das Gespräch allein tragen, und du lernst gleich mehrere Menschen kennen. Ob du jemanden wiedersehen willst, entscheidest du in Ruhe am Tag danach.",
      },
      {
        title: "Menschen, die zu dir passen",
        points: [
          "Am Tisch liegen höchstens zehn Jahre zwischen der jüngsten und der ältesten Person.",
          "Welches Alter du dir wünschst, sagst du im Kennenlern-Chat – die KI berücksichtigt das.",
          "Wer etwas Ernsthaftes sucht, sitzt möglichst mit Menschen, die das auch tun.",
        ],
      },
      {
        title: "Diskret und sicher",
        text: "Geprüfte Profile, ein öffentliches Lokal, und deine Telefonnummer bleibt bei dir. Kontakt gibt es nur, wenn beide es wollen – privat, am Tag danach.",
      },
    ],
    faq: [
      {
        q: "Bin ich mit über 50 noch richtig?",
        a: "Ja. Entscheidend ist, dass genug Menschen in deinem Alter dabei sind – die KI wartet lieber, bis die Runde passt.",
      },
      {
        q: "Wie läuft der Abend ab?",
        a: "Ihr trefft euch im Lokal, reserviert ist auf „Tisch6“. Eine Gesprächskarte mit drei Runden Fragen bringt euch ins Reden. Jeder zahlt seine eigene Rechnung.",
      },
      {
        q: "Kann ich jemanden mitbringen?",
        a: "Ja. Ihr bewerbt euch zu zweit, und wir setzen euch möglichst an denselben Abend – an verschiedene Tische.",
      },
    ],
  },
  {
    slug: "speed-dating-wien",
    short: "Alternative zu Speed Dating",
    title: "Speed Dating in Wien? Die entspanntere Alternative",
    description:
      "Speed Dating in Wien ist dir zu hektisch? Bei Tisch6 hast du einen ganzen Abend mit fünf anderen Singles an einem Tisch – ohne Stoppuhr und ohne Druck.",
    eyebrow: "Speed Dating Wien",
    h1: "Speed Dating in Wien – oder lieber ein ganzer Abend?",
    lead: "Beim Speed Dating hast du ein paar Minuten pro Person, dann geht es weiter zum nächsten Tisch. Das ist schnell, aber oft hektisch. Bei Tisch6 hast du einen ganzen Abend – mit fünf Menschen, die unsere KI für dich ausgewählt hat.",
    sections: [
      {
        title: "Speed Dating und Tisch6 im Vergleich",
        points: [
          "Zeit: beim Speed Dating wenige Minuten pro Gespräch, bei Tisch6 ein ganzer Abend.",
          "Auswahl: beim Speed Dating triffst du alle der Reihe nach, bei Tisch6 wählt die KI eine passende Runde.",
          "Stimmung: statt Wechseln nach Stoppuhr ein gemeinsames Abendessen in einem Wiener Lokal.",
          "Entscheidung: bei Tisch6 sagst du erst am Tag danach anonym, wen du wiedersehen willst.",
        ],
      },
      {
        title: "Was besser zu dir passt",
        text: "Wer an einem Abend möglichst viele Menschen kurz sehen will, ist beim Speed Dating richtig. Wer lieber in Ruhe redet und Menschen wirklich kennenlernen will, ist bei Tisch6 besser aufgehoben.",
      },
    ],
    faq: [
      { q: "Wie viele Menschen lerne ich an einem Abend kennen?", a: "Fünf – an jedem Tisch sitzen drei Frauen und drei Männer." },
      { q: "Was kostet ein Abend?", a: "38 € pro Tischteilnahme, die Bewerbung ist kostenlos. Essen und Getränke zahlt jeder selbst." },
      { q: "Gibt es eine Stoppuhr?", a: "Nein. Ihr habt den ganzen Abend Zeit – und eine Gesprächskarte, falls ihr Anregungen braucht." },
    ],
  },
];

export const themaBySlug = (slug: string) => THEMEN.find((t) => t.slug === slug);
