// Inhalte der Instagram-Beiträge: Texte auf den Bildern/Reels und die Bildunterschriften.
// Fakten (Preise, Ablauf) müssen zur Website passen – bei Änderungen dort auch hier anpassen.

const TAGS = "#wien #singleswien #datingwien #wienerleben #vienna";
const CTA = "Bewerbung kostenlos – Link in der Bio. Folge @tischsechs, damit du nichts verpasst.";
const TAG_A_FRIEND = "Kennst du jemanden, der da hin muss? Markier ihn oder sie in den Kommentaren 👇";

/** Reels: 1080×1920, Szenen mit Start/Ende in Sekunden. `bg`: Foto aus /public/bilder oder null (nur Grafik). */
export const reels = [
  {
    id: "reel-kein-wischen",
    bg: "salon-wien.jpg",
    ai: true,
    duration: 15,
    scenes: [
      { from: 0, to: 3.6, eyebrow: "Single in Wien?", lines: ["Kein Wischen.", { t: "Kein Ghosting.", at: 1 }] },
      { from: 3.8, to: 7.4, lines: ["Sechs Singles.", { t: "Ein Tisch.", at: 0.5 }, { t: "Ein Abend.", at: 1, gold: true }] },
      { from: 7.6, to: 11.2, lines: ["Unsere KI stellt", "den Tisch zusammen –"], sub: { t: "du musst nur hingehen.", at: 0.8 } },
      { from: 11.4, to: 15.2, cta: true },
    ],
    caption: `Kein Wischen. Kein Ghosting. Echte Menschen am Tisch. 🕯️

Tisch6 bringt sechs Singles in Wien an einen Tisch – drei Frauen, drei Männer. Nicht du suchst: Unsere KI stellt den Tisch so zusammen, dass die Gespräche von selbst laufen. Du bewirbst dich einmal, den Rest machen wir.

${TAG_A_FRIEND}

${CTA}

${TAGS}`,
  },
  {
    id: "reel-automatisch",
    bg: null,
    ai: false,
    duration: 16,
    scenes: [
      { from: 0, to: 3.2, lines: ["Du machst", { t: "genau eine Sache.", gold: true }] },
      { from: 3.4, to: 6.2, eyebrow: "Schritt 1", lines: ["Dich bewerben."], sub: { t: "10 Minuten Chat mit unserer KI-Gastgeberin.", at: 0.6 } },
      {
        from: 6.4,
        to: 12.6,
        eyebrow: "Den Rest macht Tisch6",
        list: [
          { t: "Passenden Tisch finden", at: 0.6 },
          { t: "Termin und Lokal festlegen", at: 1.4 },
          { t: "Einladung und Erinnerung schicken", at: 2.2 },
          { t: "Wiedersehen, wenn beide wollen", at: 3 },
        ],
      },
      { from: 12.8, to: 16.2, cta: true },
    ],
    caption: `Dating, das sich um sich selbst kümmert. ✨

Du bewirbst dich einmal – zehn Minuten Chat mit unserer KI-Gastgeberin. Danach läuft alles automatisch: Die KI stellt jede Nacht passende Tische zusammen, wir legen Termin und Lokal fest, du bekommst Einladung und Erinnerung. Und am Tag danach gibt es Kontakt nur, wenn es beide wollen.

Singles in Wien, die keine Lust mehr auf Dating-Apps haben: ${CTA}

${TAGS}`,
  },
  {
    id: "reel-pov",
    bg: "tischrunde.jpg",
    ai: true,
    duration: 17.5,
    scenes: [
      { from: 0, to: 3.4, eyebrow: "POV", lines: ["Eine KI hat", "deinen Tisch", { t: "zusammengestellt.", gold: true }] },
      { from: 3.6, to: 7, lines: ["3 Frauen.", { t: "3 Männer.", at: 0.5 }], sub: { t: "Maximal zehn Jahre auseinander.", at: 1.1 } },
      { from: 7.2, to: 10.6, lines: ["Ein ausgewähltes", "Wiener Lokal."], sub: { t: "Reserviert auf „Tisch6“.", at: 0.8 } },
      { from: 10.8, to: 14, eyebrow: "Am Tag danach", lines: ["Wiedersehen nur,", { t: "wenn es beide wollen.", gold: true }] },
      { from: 14.2, to: 17.7, cta: true },
    ],
    caption: `POV: Du musst nicht mehr wischen – eine KI hat deinen Tisch zusammengestellt. 🥂

Drei Frauen, drei Männer, ähnliche Wellenlänge. Ein ausgewähltes Wiener Lokal, reserviert auf „Tisch6“. Am Tag danach sagst du anonym, wen du wiedersehen möchtest – Kontakt gibt es nur, wenn es beidseitig ist.

Neue Leute kennenlernen in Wien, ganz ohne App-Stress. ${TAG_A_FRIEND}

${CTA}

${TAGS}`,
  },
  {
    id: "reel-fuer-frauen",
    bg: "gedeck.jpg",
    ai: true,
    duration: 18,
    scenes: [
      { from: 0, to: 3.2, eyebrow: "Für Frauen", lines: ["Sicher vom", { t: "ersten Moment an.", gold: true }] },
      {
        from: 3.4,
        to: 11.4,
        eyebrow: "Bei Tisch6",
        list: [
          { t: "Jede Person geprüft: SMS & Foto", at: 0.4 },
          { t: "Öffentliches Lokal, zu sechst", at: 2 },
          { t: "Deine Nummer bleibt bei dir", at: 3.6 },
          { t: "Meldeknopf & Notfallnummer", at: 5.2 },
        ],
      },
      { from: 11.6, to: 14.6, lines: ["Bring eine", { t: "Freundin mit.", gold: true }], sub: { t: "Gleicher Abend, verschiedene Tische.", at: 0.8 } },
      { from: 14.8, to: 18.2, cta: true },
    ],
    caption: `Für Frauen: Du sollst dich vom ersten Moment an wohlfühlen. 🤍

Bei Tisch6 ist jede Person geprüft (SMS-Code und Verifizierungsfoto, das nur unser Team sieht). Ihr trefft euch in einem öffentlichen Lokal, zu sechst. Deine Nummer bleibt bei dir – Kontakt gibt es nur bei gegenseitigem Interesse. Und am Abend hast du einen diskreten Meldeknopf und eine Notfallnummer.

Lieber nicht allein? Bring eine Freundin mit – gleicher Abend, verschiedene Tische. ${CTA}

${TAGS}`,
  },
  {
    id: "reel-fuer-maenner",
    bg: "salon-wien.jpg",
    ai: true,
    duration: 17.5,
    scenes: [
      { from: 0, to: 3.2, eyebrow: "Für Männer", lines: ["Keine Konkurrenz", { t: "am Tisch.", gold: true }] },
      {
        from: 3.4,
        to: 11,
        eyebrow: "Bei Tisch6",
        list: [
          { t: "Kein Wischen ins Leere", at: 0.4 },
          { t: "3 Frauen, 3 Männer – fair", at: 2 },
          { t: "Keine öffentliche Ablehnung", at: 3.6 },
          { t: "Bring einen Freund mit", at: 5.2 },
        ],
      },
      { from: 11.2, to: 14.2, lines: ["Ein gutes Essen.", { t: "Echte Gespräche.", gold: true }] },
      { from: 14.4, to: 17.7, cta: true },
    ],
    caption: `Männer, ehrlich: Wie viele Matches haben euch zuletzt wirklich geantwortet? 😅

Bei Tisch6 gibt es kein Wischen ins Leere. Drei Frauen, drei Männer, ein gutes Abendessen in Wien – niemand muss um Aufmerksamkeit kämpfen. Ob dich jemand wiedersehen will, erfährst du am Tag danach privat, nie vor anderen. Und du kannst einen Freund mitbringen: gleicher Abend, verschiedene Tische.

${CTA}

${TAGS}`,
  },
  {
    id: "reel-gruendungspaket",
    bg: null,
    ai: false,
    duration: 15.5,
    scenes: [
      { from: 0, to: 3, eyebrow: "Die ersten 300 in Wien", lines: ["Dein Platz", { t: "ist reserviert.", gold: true }] },
      { from: 3.2, to: 8.4, eyebrow: "Gründungspaket", lines: ["Drei Abende."], sub: { t: "79 € statt 114 €", at: 1, big: true }, sub2: { t: "26,33 € pro Abend statt 38 €", at: 2 } },
      { from: 8.6, to: 12.2, lines: ["Bewerbung", { t: "kostenlos.", gold: true }], sub: { t: "Bezahlt wird erst, wenn dein Tisch steht.", at: 0.8 } },
      { from: 12.4, to: 15.7, cta: true },
    ],
    caption: `Gründungsmitglied werden: drei Abende für 79 € statt 114 €. 🥂

Für die ersten 300 in Wien. Das sind 26,33 € pro Abend statt 38 €, zwölf Monate gültig, mit Abzeichen „Gründungsmitglied“ im Profil. Die Bewerbung ist kostenlos – bezahlt wird erst bei deiner ersten Einladung. Essen und Getränke zahlt jeder selbst im Lokal.

${CTA}

${TAGS}`,
  },
];

/** Karussells: 1080×1350, je Folie ein Objekt. */
export const carousels = [
  {
    id: "karussell-so-funktionierts",
    ai: false,
    slides: [
      { kind: "cover", eyebrow: "Singles in Wien", title: ["So funktioniert"], gold: "Tisch6.", sub: "Du bewirbst dich einmal – den Rest machen wir.", hint: true },
      { kind: "step", n: "I", title: "Bewerben", text: "Zehn Minuten Chat mit unserer KI-Gastgeberin. Dazu ein SMS-Code und ein Foto, das nur unser Team sieht. Kostenlos." },
      { kind: "step", n: "II", title: "Die KI stellt den Tisch zusammen", text: "Jede Nacht: drei Frauen, drei Männer, maximal zehn Jahre auseinander – an deinen Wunschtagen." },
      { kind: "step", n: "III", title: "Einladung & Abend", text: "Einladung per E-Mail und SMS. Ein ausgewähltes Wiener Lokal, reserviert auf „Tisch6“. Eine Gesprächskarte bringt euch ins Reden." },
      { kind: "step", n: "IV", title: "Wiedersehen", text: "Am Tag danach sagst du anonym, wen du wiedersehen willst. Kontakt gibt es nur, wenn es beidseitig ist.", cta: true },
    ],
    caption: `So funktioniert Tisch6 – in vier Schritten. 👉

1. Bewerben: zehn Minuten Chat mit unserer KI-Gastgeberin, kostenlos.
2. Die KI stellt jede Nacht passende Tische zusammen – drei Frauen, drei Männer.
3. Du bekommst deine Einladung: ausgewähltes Wiener Lokal, reserviert auf „Tisch6“.
4. Am Tag danach: Wiedersehen nur, wenn es beide wollen.

Speichern für später – und ${CTA}

${TAGS}`,
  },
  {
    id: "karussell-warum-tisch6",
    ai: false,
    slides: [
      { kind: "cover", eyebrow: "Dating in Wien", title: ["Kein Wischen.", "Kein Ghosting."], gold: "Echte Menschen\nam Tisch.", hint: true },
      { kind: "point", title: "Kein Wischen", text: "Du suchst nicht stundenlang. Unsere KI stellt einen Tisch zusammen, an dem die Gespräche von selbst laufen." },
      { kind: "point", title: "Kein Ghosting", text: "Ihr sitzt euch gegenüber. Ein echter Abend statt endloser Chats." },
      { kind: "point", title: "Kein Druck", text: "Sechs Menschen statt Date zu zweit. Wiedersehen nur, wenn es beide wollen – anonym, am Tag danach." },
      { kind: "cover", eyebrow: "Tisch6", title: ["Dein Platz"], gold: "am Tisch wartet.", cta: true },
    ],
    caption: `Warum Tisch6 statt Dating-App? 🤔

Kein Wischen: Die KI stellt den Tisch zusammen.
Kein Ghosting: Ihr sitzt euch gegenüber.
Kein Druck: Sechs Menschen statt Date zu zweit – Wiedersehen nur, wenn es beide wollen.

Schick das jemandem, der Dating-Apps genauso satt hat – oder markier ihn oder sie in den Kommentaren 👇

${CTA}

${TAGS}`,
  },
  {
    id: "karussell-sicher-fair",
    ai: false,
    slides: [
      { kind: "cover", eyebrow: "Tisch6", title: ["Sicher für Frauen."], gold: "Fair für Männer.", hint: true },
      { kind: "list", eyebrow: "Für Frauen", title: "Du sollst dich wohlfühlen.", items: ["Jede Person geprüft – SMS-Code und Foto", "Öffentliches Lokal, zu sechst", "Deine Nummer bleibt bei dir", "Meldeknopf und Notfallnummer am Abend", "Bring eine Freundin mit"] },
      { kind: "list", eyebrow: "Für Männer", title: "Keine Konkurrenz am Tisch.", items: ["Drei Frauen, drei Männer", "Kein Wischen ins Leere", "Keine öffentliche Ablehnung", "Wiedersehen privat, am Tag danach", "Bring einen Freund mit"] },
      { kind: "cover", eyebrow: "Tisch6", title: ["Dein Platz"], gold: "am Tisch wartet.", cta: true },
    ],
    caption: `Sicher für Frauen. Fair für Männer. 🤝

Bei Tisch6 ist jede Person geprüft, ihr trefft euch zu sechst in einem öffentlichen Wiener Lokal und eure Nummern bleiben privat. Für Männer heißt das: keine Konkurrenz, keine öffentliche Ablehnung – nur ein guter Abend mit echten Gesprächen.

Und ihr könnt zu zweit kommen: Bring eine Freundin oder einen Freund mit. ${CTA}

${TAGS}`,
  },
  {
    id: "karussell-faq",
    ai: false,
    slides: [
      { kind: "cover", eyebrow: "Tisch6", title: ["Häufige"], gold: "Fragen.", hint: true },
      { kind: "qa", q: "Was kostet das?", a: "38\u00a0€ pro Tischteilnahme. Die ersten 300 in Wien bekommen drei Abende für 79\u00a0€ statt\u00a0114\u00a0€. Essen und Getränke zahlt jeder selbst im Lokal." },
      { kind: "qa", q: "Wer sitzt am Tisch?", a: "Drei Frauen und drei Männer, maximal zehn Jahre auseinander. Jede Person ist geprüft – mit SMS-Code und Foto." },
      { kind: "qa", q: "Und wenn es nicht funkt?", a: "Kein Problem. Am Tag danach sagst du anonym, wen du wiedersehen willst. Kontakt gibt es nur, wenn es beide wollen." },
      { kind: "qa", q: "Kann ich zu zweit kommen?", a: "Ja – bring eine Freundin oder einen Freund mit. Gleicher Abend, gleiches Lokal, verschiedene Tische.", cta: true },
    ],
    caption: `Eure häufigsten Fragen zu Tisch6 – kurz beantwortet. 💬

Was kostet das? Wer sitzt am Tisch? Was, wenn es nicht funkt? Und kann ich zu zweit kommen? Alles im Karussell. 👉

Noch eine Frage? Schreib uns an info@tisch6.at. ${CTA}

${TAGS}`,
  },
];

/** Einzelbilder: 1080×1350. */
export const posts = [
  {
    id: "bild-gruendungspaket",
    ai: false,
    kind: "founder",
    caption: `Dein Platz ist reserviert. 🥂

Gründungspaket für die ersten 300 in Wien: drei Abende für 79 € statt 114 € – das sind 26,33 € pro Abend statt 38 €. Zwölf Monate gültig, mit Abzeichen „Gründungsmitglied“ im Profil. Zahlung erst bei deiner ersten Einladung.

Die Bewerbung ist kostenlos. Essen und Getränke zahlt jeder selbst im Lokal. ${CTA}

${TAGS}`,
  },
  {
    id: "bild-wien",
    ai: true,
    kind: "photo",
    bg: "tischrunde.jpg",
    eyebrow: "Wien bei Kerzenlicht",
    title: "Ein Abend, wie ihn",
    gold: "nur Wien kann.",
    caption: `Ein gedeckter Tisch, warmes Licht, sechs Menschen, die sich etwas zu sagen haben. 🕯️

Wir kümmern uns um alles davor – ihr um das Gespräch. Tisch6: KI-kuratierte Dating-Dinner für Singles in Wien.

${CTA}

${TAGS}`,
  },
];
