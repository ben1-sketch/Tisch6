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
  {
    slug: "frauen-kennenlernen-wien",
    short: "Frauen kennenlernen in Wien",
    title: "Frauen kennenlernen in Wien – ohne App, beim Dinner",
    description:
      "Frauen kennenlernen in Wien, ohne Wischen und ohne Anmachspruch: Bei Tisch6 sitzt du mit drei Frauen und zwei Männern an einem Tisch. Von einer KI zusammengestellt.",
    eyebrow: "Für Männer",
    h1: "Frauen kennenlernen in Wien: ein Abend auf Augenhöhe",
    lead: "Viele Männer kennen das: Auf Dating-Apps kommen kaum Antworten, und in Bars ist ein Gespräch schnell vorbei. Bei Tisch6 sitzt du mit drei Frauen und zwei weiteren Männern an einem Tisch – ausgewählt von einer KI, die vorher mit allen gesprochen hat.",
    sections: [
      {
        title: "Warum das für Männer gut funktioniert",
        points: [
          "Kein Wettbewerb um Profilbilder: Am Tisch zählen Gespräch, Humor und echtes Interesse.",
          "Gleich viele Frauen und Männer: drei und drei an jedem Tisch.",
          "Kein Anmachspruch nötig: Eine Gesprächskarte mit drei Runden Fragen bringt alle ins Reden.",
          "Keine Abfuhr vor anderen: Wen du wiedersehen möchtest, sagst du am Tag danach anonym. Kontakt gibt es nur, wenn es beidseitig ist.",
        ],
      },
      {
        title: "Gerade besonders gefragt",
        text: "Zurzeit warten mehr Frauen als Männer auf einen Tisch, vor allem zwischen 35 und 48. Wer sich jetzt bewirbt, hat gute Chancen auf einen baldigen Platz.",
      },
      {
        title: "So läuft es ab",
        points: [
          "Du bewirbst dich kostenlos: ein Kennenlern-Chat von rund zehn Minuten, dazu ein SMS-Code und ein Foto, das nur unser Team sieht.",
          "Die KI stellt jede Nacht passende Tische zusammen – höchstens zehn Jahre zwischen der jüngsten und der ältesten Person.",
          "Du bekommst eine Einladung per E-Mail. Bezahlt wird erst, wenn du zusagst: 38 € pro Tischteilnahme.",
          "Ihr trefft euch in einem ausgewählten Wiener Lokal, reserviert ist auf „Tisch6“.",
        ],
      },
    ],
    faq: [
      {
        q: "Wie alt sind die Frauen am Tisch?",
        a: "Am Tisch liegen höchstens zehn Jahre zwischen der jüngsten und der ältesten Person. Welches Alter du dir wünschst, sagst du im Kennenlern-Chat.",
      },
      { q: "Wer zahlt die Rechnung?", a: "Jeder zahlt seine eigene Rechnung, also nur das, was er selbst bestellt hat. Die Tischteilnahme kostet 38 €, die Bewerbung ist kostenlos." },
      { q: "Wann gibt es Tische?", a: "Tische gibt es {tage}. Welche Tage dir passen, sagst du im Kennenlern-Chat." },
    ],
  },
  {
    slug: "partnersuche-wien",
    short: "Partnersuche in Wien",
    title: "Partnersuche in Wien: persönlich statt online",
    description:
      "Partnersuche in Wien ohne Profilbilder und endlose Chats: Bei Tisch6 lernst du passende Singles bei einem Abendessen zu sechst kennen, ausgewählt von einer KI.",
    eyebrow: "Partnersuche Wien",
    h1: "Partnersuche in Wien: erst kennenlernen, dann entscheiden",
    lead: "Online beginnt die Partnersuche mit Fotos und Profiltexten. Tisch6 dreht das um: Du lernst Menschen zuerst persönlich kennen – bei einem Abendessen zu sechst – und entscheidest danach in Ruhe, wen du wiedersehen möchtest.",
    sections: [
      {
        title: "Was Tisch6 anders macht",
        points: [
          "Die Auswahl trifft eine KI nach einem Gespräch mit dir, nicht ein Algorithmus nach Fotos.",
          "Du triffst fünf Menschen auf einmal, an einem Tisch in einem Wiener Lokal.",
          "Kein Druck am Abend: Wen du wiedersehen möchtest, sagst du am Tag danach anonym.",
          "Kontakt gibt es nur, wenn das Interesse beidseitig ist.",
        ],
      },
      {
        title: "Für wen das passt",
        text: "Für Singles in Wien ab 18, die eine Beziehung suchen oder offen dafür sind. Was du suchst, fragt die KI im Kennenlern-Chat – wer etwas Ernsthaftes sucht, sitzt möglichst mit Menschen, die das auch tun.",
      },
      {
        title: "Was es kostet",
        text: "Die Bewerbung ist kostenlos. Eine Tischteilnahme kostet 38 €, bezahlt wird erst, wenn du zusagst. Für die ersten 300 in Wien gibt es das Gründungspaket: drei Abende für 79 €. Essen und Getränke zahlt jeder selbst im Lokal.",
      },
    ],
    faq: [
      {
        q: "Ist Tisch6 eine Partnervermittlung?",
        a: "Tisch6 stellt keine Paare zusammen, sondern Tische: sechs Menschen, ein Abend. Wen du wiedersehen willst, entscheidest du selbst.",
      },
      {
        q: "Wie schnell bekomme ich einen Tisch?",
        a: "Sobald fünf Menschen da sind, die gut zu dir passen. Die KI plant jede Nacht – lieber ein paar Tage warten als ein Tisch, der nicht passt.",
      },
      { q: "Wann gibt es Tische?", a: "Tische gibt es {tage}. Welche Tage dir passen, sagst du im Kennenlern-Chat." },
    ],
  },
  {
    slug: "dating-ohne-app",
    short: "Dating ohne App",
    title: "Dating ohne App in Wien: Begegnungen statt Wischen",
    description:
      "Müde von Dating-Apps? Bei Tisch6 triffst du Singles in Wien ohne App: ein Abend zu sechst in einem ausgewählten Lokal, zusammengestellt von einer KI.",
    eyebrow: "Dating ohne App",
    h1: "Dating ohne App: ein Abend statt hundert Chats",
    lead: "Wischen, matchen, schreiben, warten – und am Ende kommt kein Treffen zustande. Bei Tisch6 gibt es keine App: Du bewirbst dich einmal, und unsere KI setzt dich mit fünf passenden Menschen an einen Tisch in Wien.",
    sections: [
      {
        title: "Was du dir sparst",
        points: [
          "Kein Profilbild, nach dem andere urteilen: Dein Foto sieht nur unser Team.",
          "Keine endlosen Chats: Ihr trefft euch direkt beim Abendessen.",
          "Kein Ghosting am Tisch: Ihr sitzt euch gegenüber.",
          "Kein Abo: Die Bewerbung ist kostenlos, du zahlst nur für einen Abend, zu dem du zusagst.",
        ],
      },
      {
        title: "Wie es stattdessen läuft",
        points: [
          "Ein Kennenlern-Chat von rund zehn Minuten mit unserer KI-Gastgeberin, auf tisch6.at.",
          "Eine Einladung per E-Mail mit Datum, Lokal und Runde.",
          "Ein Abend zu sechst mit einer Gesprächskarte vom Aperitif bis zum Dessert.",
          "Am Tag danach sagst du anonym, wen du wiedersehen möchtest.",
        ],
      },
    ],
    faq: [
      { q: "Brauche ich eine App?", a: "Nein. Alles läuft über tisch6.at und per E-Mail. Die Bewerbung dauert rund zehn Minuten." },
      { q: "Was, wenn niemand am Tisch passt?", a: "Dann war es trotzdem ein schöner Abend. Kontakt gibt es nur, wenn das Interesse beidseitig ist." },
      { q: "Was kostet es?", a: "Die Bewerbung ist kostenlos, eine Tischteilnahme kostet 38 €. Essen und Getränke zahlt jeder selbst im Lokal." },
    ],
  },
  {
    slug: "singles-ab-30-wien",
    short: "Singles ab 30 in Wien",
    title: "Singles ab 30 in Wien kennenlernen – beim Dinner",
    description:
      "Singles ab 30 in Wien: Bei Tisch6 sitzt du mit fünf Menschen in deinem Alter an einem Tisch in einem Wiener Lokal, ausgewählt von einer KI. Bewerbung kostenlos.",
    eyebrow: "Singles ab 30",
    h1: "Singles ab 30 in Wien: neue Menschen bei einem Abendessen",
    lead: "Mit 30 plus sieht das Leben anders aus als mit Anfang 20: Der Job fordert, viele Freunde sind vergeben, und für endlose Chats fehlt die Geduld. Tisch6 bringt dich mit fünf Menschen in deinem Alter an einen Tisch – ohne Wischen.",
    sections: [
      {
        title: "Warum ein Tisch zu sechst?",
        text: "Ein Abend zu sechst ist entspannter als ein Date zu zweit: Niemand muss das Gespräch allein tragen, und du lernst gleich mehrere Menschen kennen. Am Tag danach sagst du anonym, wen du wiedersehen möchtest – Kontakt gibt es nur, wenn es beidseitig ist.",
      },
      {
        title: "Menschen, die zu deinem Leben passen",
        points: [
          "Am Tisch liegen höchstens zehn Jahre zwischen der jüngsten und der ältesten Person.",
          "Die KI fragt im Kennenlern-Chat, was du suchst – eine Beziehung oder erst einmal neue Menschen – und berücksichtigt es.",
          "Auch Kinderwunsch, Rauchen und Essgewohnheiten kommen im Gespräch vor, damit die Runde passt.",
        ],
      },
      {
        title: "So läuft es ab",
        points: [
          "Kostenlos bewerben: Kennenlern-Chat, SMS-Code und ein Foto, das nur unser Team sieht.",
          "Einladung per E-Mail mit Datum, Lokal und Runde. Bezahlt wird erst, wenn du zusagst: 38 €.",
          "Abendessen in einem ausgewählten Wiener Lokal, jeder zahlt seine eigene Rechnung.",
        ],
      },
    ],
    faq: [
      {
        q: "Mit wem sitze ich am Tisch?",
        a: "Mit Menschen, die höchstens zehn Jahre auseinander sind und zu deinem Wunschalter passen. Welches Alter du dir wünschst, sagst du im Kennenlern-Chat.",
      },
      { q: "Was kostet ein Abend?", a: "Die Bewerbung ist kostenlos, eine Tischteilnahme kostet 38 €. Essen und Getränke zahlt jeder selbst im Lokal." },
      { q: "Wann finden die Tische statt?", a: "Tische gibt es {tage}. Welche Tage dir passen, sagst du im Kennenlern-Chat." },
    ],
  },
  {
    slug: "single-events-wien",
    short: "Single-Events in Wien",
    title: "Single-Events in Wien: Abendessen statt Singleparty",
    description:
      "Single-Events in Wien, nur entspannter: Bei Tisch6 sitzen drei Frauen und drei Männer einen ganzen Abend an einem Tisch. Kein Gedränge, keine Stoppuhr.",
    eyebrow: "Single-Events Wien",
    h1: "Single-Events in Wien – oder lieber ein Tisch für sechs?",
    lead: "Singlepartys sind laut, Speed Dating ist hektisch, und bei großen Events redet man mit vielen, aber mit niemandem richtig. Tisch6 ist ein kleines Single-Event: sechs Menschen, ein Tisch, ein ganzer Abend.",
    sections: [
      {
        title: "Was einen Tisch6-Abend ausmacht",
        points: [
          "Klein statt groß: drei Frauen und drei Männer, höchstens zehn Jahre auseinander.",
          "Ausgewählt statt zufällig: Eine KI stellt die Runde nach einem kurzen Kennenlern-Chat zusammen.",
          "Ruhig statt laut: ein ausgewähltes Wiener Lokal, reserviert auf „Tisch6“.",
          "Ohne Druck: Wen du wiedersehen willst, sagst du am Tag danach anonym.",
        ],
      },
      {
        title: "Termine",
        text: "Feste öffentliche Termine gibt es nicht: Jede Runde wird für die Menschen geplant, die daran teilnehmen. Tische gibt es {tage} – du sagst im Kennenlern-Chat, welche Tage dir passen, und bekommst deine Einladung per E-Mail.",
      },
    ],
    faq: [
      { q: "Wie viele Leute sind dabei?", a: "Sechs: drei Frauen und drei Männer." },
      {
        q: "Kann ich mit einer Freundin oder einem Freund kommen?",
        a: "Ja. Ihr bewerbt euch zu zweit, und wir setzen euch möglichst an denselben Abend – an verschiedene Tische.",
      },
      { q: "Was kostet es?", a: "Die Bewerbung ist kostenlos, eine Tischteilnahme kostet 38 €. Essen und Getränke zahlt jeder selbst im Lokal." },
    ],
  },
  {
    slug: "blind-date-wien",
    short: "Blind Date in Wien",
    title: "Blind Date in Wien – zu sechst und ohne Druck",
    description:
      "Ein Blind Date in Wien, nur entspannter: Bei Tisch6 triffst du fünf Singles, die eine KI für dich ausgewählt hat, bei einem Abendessen in einem Wiener Lokal.",
    eyebrow: "Blind Date Wien",
    h1: "Blind Date in Wien: fünf Unbekannte, ein Tisch",
    lead: "Bei einem Blind Date weißt du vorher nicht, wen du triffst – das macht es spannend und manchmal nervös. Bei Tisch6 bleibt die Spannung, der Druck nicht: Ihr seid zu sechst, und eine KI hat die Runde vorher sorgfältig zusammengestellt.",
    sections: [
      {
        title: "Blind, aber nicht zufällig",
        text: "Bevor du an einen Tisch kommst, führt unsere KI-Gastgeberin ein kurzes Gespräch mit dir: Fakten, Lebensstil, Persönlichkeit. Daraus stellt sie Runden zusammen, in denen die Gespräche von selbst laufen. Vorher erfährst du nur Alter und Zusammensetzung der Runde – wer genau dabei ist, siehst du am Abend.",
      },
      {
        title: "Sicher",
        points: [
          "Jede Person ist per SMS-Code und Foto geprüft.",
          "Ihr trefft euch in einem öffentlichen Lokal.",
          "Deine Telefonnummer bleibt bei dir – Kontakt gibt es nur, wenn beide es wollen.",
        ],
      },
    ],
    faq: [
      { q: "Sehe ich vorher Fotos der anderen?", a: "Nein. Fotos sieht nur unser Team zur Prüfung. Ihr lernt euch am Abend kennen." },
      {
        q: "Was, wenn ich nervös bin?",
        a: "Das ist ganz normal. Zu sechst muss niemand das Gespräch allein tragen, und eine Gesprächskarte hilft beim Einstieg.",
      },
      { q: "Was kostet es?", a: "Die Bewerbung ist kostenlos, eine Tischteilnahme kostet 38 €. Essen und Getränke zahlt jeder selbst im Lokal." },
    ],
  },
  {
    slug: "neue-leute-kennenlernen-wien",
    short: "Neue Leute kennenlernen in Wien",
    title: "Neue Leute kennenlernen in Wien – beim Abendessen",
    description:
      "Neue Leute in Wien kennenlernen, als Single: Bei Tisch6 sitzt du mit fünf anderen an einem Tisch in einem Wiener Lokal. Ausgewählt von einer KI, Bewerbung kostenlos.",
    eyebrow: "Neue Leute kennenlernen",
    h1: "Neue Leute kennenlernen in Wien – als Single",
    lead: "Neu in Wien, der Freundeskreis hat sich verändert oder du willst einfach raus aus dem Alltag? Tisch6 bringt Singles bei einem Abendessen zusammen: sechs Menschen, die sich sonst nie begegnet wären.",
    sections: [
      {
        title: "Für wen Tisch6 ist",
        text: "Tisch6 ist für Singles ab 18 in Wien. Manche suchen eine Beziehung, andere wollen erst einmal neue Menschen kennenlernen – beides ist in Ordnung. Die KI fragt im Kennenlern-Chat danach und berücksichtigt es bei deinem Tisch.",
      },
      {
        title: "Warum ein Tisch hilft",
        points: [
          "Ein fester Rahmen: Datum, Lokal und Runde stehen fest, du musst nur kommen.",
          "Eine Gesprächskarte mit drei Runden Fragen bringt alle ins Reden.",
          "Gleich fünf neue Menschen an einem Abend.",
        ],
      },
      {
        title: "Neu in Wien?",
        text: "Wer neu in der Stadt ist, kennt das: Kollegen ja, Freunde noch wenige. Ein Abend bei Tisch6 ist ein einfacher Anfang – in einem ausgewählten Lokal, das du vielleicht noch nicht kennst.",
      },
    ],
    faq: [
      { q: "Muss ich Single sein?", a: "Ja, Tisch6 ist für Singles." },
      { q: "In welcher Sprache finden die Abende statt?", a: "Auf Deutsch." },
      { q: "Was kostet es?", a: "Die Bewerbung ist kostenlos, eine Tischteilnahme kostet 38 €. Essen und Getränke zahlt jeder selbst im Lokal." },
    ],
  },
  {
    slug: "wo-singles-kennenlernen-wien",
    short: "Wo man in Wien Singles kennenlernt",
    title: "Wo lernt man in Wien Singles kennen? Sieben Ideen",
    description:
      "Wo lernt man in Wien Singles kennen? Sieben Ideen von Sport über Kurse bis Dinner-Dating – mit ihren Vor- und Nachteilen, ehrlich eingeordnet.",
    eyebrow: "Ratgeber",
    h1: "Wo lernt man in Wien Singles kennen?",
    lead: "In Wien leben über zwei Millionen Menschen – und trotzdem fragen sich viele, wo man hier eigentlich Singles kennenlernt. Sieben Wege, mit ihren Vor- und Nachteilen.",
    sections: [
      {
        title: "1. Sport in der Gruppe",
        text: "Laufgruppen, Padel oder Bouldern: Man trifft sich regelmäßig und kommt beim gemeinsamen Hobby leicht ins Gespräch. Der Nachteil: Ob jemand Single ist, weiß man selten.",
      },
      {
        title: "2. Kurse",
        text: "Koch-, Tanz- oder Sprachkurse bringen Menschen über Wochen zusammen, manche richten sich ausdrücklich an Singles. Der Nachteil: Die Gruppen sind oft ungleich gemischt.",
      },
      {
        title: "3. Vereine und Ehrenamt",
        text: "Wer sich für etwas engagiert, trifft Menschen mit ähnlichen Werten. Das braucht Zeit, schafft aber echte Verbindungen.",
      },
      {
        title: "4. Freunde von Freunden",
        text: "Viele lernen ihre Partnerin oder ihren Partner über gemeinsame Bekannte kennen. Sag deinem Umfeld ruhig, dass du offen dafür bist.",
      },
      {
        title: "5. Dating-Apps",
        text: "Sie bieten die größte Auswahl. Viele empfinden das Wischen und Chatten aber als anstrengend, und aus vielen Matches werden wenige Treffen.",
      },
      {
        title: "6. Speed Dating",
        text: "An einem Abend triffst du viele Singles für jeweils wenige Minuten. Gut für einen schnellen ersten Eindruck, für ein echtes Gespräch bleibt wenig Zeit.",
      },
      {
        title: "7. Dinner-Dating",
        text: "Bei Tisch6 sitzen drei Frauen und drei Männer einen ganzen Abend an einem Tisch, ausgewählt von einer KI nach einem kurzen Gespräch. Weniger Auswahl als in einer App, dafür Menschen, die zu dir passen, und Zeit für echte Gespräche.",
      },
    ],
    faq: [
      {
        q: "Wo treffen Singles ab 40 in Wien andere Singles?",
        a: "Die meisten Wege oben funktionieren in jedem Alter. Bei Tisch6 sitzt du mit Menschen zusammen, die höchstens zehn Jahre auseinander sind – auch ab 40.",
      },
      { q: "Was ist der einfachste Anfang?", a: "Ein fester Termin mit wenig Druck. Bei Tisch6 bewirbst du dich in rund zehn Minuten, den Rest planen wir." },
    ],
  },
];

export const themaBySlug = (slug: string) => THEMEN.find((t) => t.slug === slug);
