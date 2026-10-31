import { type Campaign, PRICES, TIMING, euro } from "./config";
import { instagramUrl, siteUrl } from "./site";
import { formatDate, formatDateTime, formatShortDate, formatTime } from "./time";
import type { EmailContent } from "./notify";

// ---------------------------------------------------------------------------
// E-Mail-Vorlage im Tisch6-Stil (Mitternachtsblau, Rosé) – funktioniert ohne externe Bilder
// ---------------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Layout = {
  subject: string;
  preheader?: string;
  title: string;
  paragraphs: string[];
  details?: [string, string][];
  lists?: { title: string; items: string[] }[];
  cta?: { label: string; url: string };
  after?: string[];
  /** kleiner Link in der Fußzeile, z. B. zum Abbestellen */
  footerLink?: { label: string; url: string };
};

function layout(o: Layout): EmailContent {
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const serif = "font-family:Georgia,'Times New Roman',serif;";
  const p = (t: string) => `<p style="${font}font-size:16px;line-height:1.6;color:#d8d3c9;margin:0 0 14px;">${esc(t)}</p>`;
  const details = o.details?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:6px 0 18px;background:#0b1120;border-radius:14px;">${o.details
        .map(
          ([k, v]) =>
            `<tr><td style="${font}padding:10px 16px;font-size:13px;color:#aab1c3;width:34%;vertical-align:top;">${esc(k)}</td><td style="${font}padding:10px 16px;font-size:15px;color:#f4efe6;">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const list = (o.lists ?? [])
    .map(
      (l) =>
        `<div style="margin:6px 0 14px;padding:16px 18px;border:1px solid #c09a57;border-radius:14px;"><div style="${font}font-size:13px;color:#d6b77a;font-weight:bold;margin-bottom:8px;">${esc(l.title)}</div>${l.items
          .map((item, i) => `<div style="${font}font-size:15px;line-height:1.5;color:#f4efe6;margin:6px 0;">${i + 1}. ${esc(item)}</div>`)
          .join("")}</div>`,
    )
    .join("");
  const cta = o.cta
    ? `<div style="margin:22px 0 8px;"><a href="${esc(o.cta.url)}" style="${font}display:inline-block;background:#d6b77a;color:#060913;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:15px 28px;border-radius:999px;">${esc(o.cta.label)}</a></div>`
    : "";
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.subject)}</title></head>
<body style="margin:0;padding:0;background:#0b1120;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader ?? o.paragraphs[0] ?? "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1120;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#121a2e;border:1px solid #4b4130;border-radius:20px;">
<tr><td style="padding:30px 28px 10px;">
<div style="${serif}font-size:24px;color:#f4efe6;">Tisch<span style="color:#d6b77a;font-style:italic;">6</span></div>
<h1 style="${serif}font-size:28px;font-weight:normal;line-height:1.25;margin:22px 0 14px;color:#f4efe6;">${esc(o.title)}</h1>
${o.paragraphs.map(p).join("")}${details}${list}${cta}${(o.after ?? []).map(p).join("")}
</td></tr>
<tr><td style="${font}padding:12px 28px 26px;font-size:12px;line-height:1.5;color:#8a90a3;">Diese E-Mail wurde automatisch verschickt. Fragen? Antworte einfach darauf oder schreib an <a href="mailto:info@tisch6.at" style="color:#8a90a3;">info@tisch6.at</a> – hier antwortet ein Mensch, keine Warteschleife.<br>Tisch6 · KI-kuratierte Dating-Dinner<br><a href="${siteUrl()}" style="color:#8a90a3;">${esc(siteUrl().replace(/^https?:\/\//, ""))}</a> · <a href="${instagramUrl}" style="color:#8a90a3;">Instagram @tischsechs</a>${o.footerLink ? `<br><a href="${esc(o.footerLink.url)}" style="color:#8a90a3;">${esc(o.footerLink.label)}</a>` : ""}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    o.title,
    "",
    ...o.paragraphs,
    ...(o.details ?? []).map(([k, v]) => `${k}: ${v}`),
    ...(o.lists ?? []).flatMap((l) => ["", l.title, ...l.items.map((item, i) => `${i + 1}. ${item}`)]),
    ...(o.cta ? ["", `${o.cta.label}: ${o.cta.url}`] : []),
    ...(o.after?.length ? ["", ...o.after] : []),
    "",
    "Diese E-Mail wurde automatisch verschickt. Fragen? Antworte einfach darauf oder schreib an info@tisch6.at – hier antwortet ein Mensch.",
    "Tisch6 · KI-kuratierte Dating-Dinner",
    `Instagram: ${instagramUrl}`,
    ...(o.footerLink ? [`${o.footerLink.label}: ${o.footerLink.url}`] : []),
  ].join("\n");

  return { subject: o.subject, html, text };
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

export type DinnerInfo = {
  startsAt: Date;
  restaurant: string;
  district: string | null;
  address: string;
};

const place = (d: DinnerInfo) => (d.district ? `${d.restaurant} (${d.district})` : d.restaurant);
const link = (path: string) => `${siteUrl()}${path}`;
export const seatUrl = (token: string) => link(`/de/einladung/${token}`);
export const feedbackUrl = (token: string) => link(`/de/wiedersehen/${token}`);
export const rejoinUrl = (magicToken: string) => link(`/de/weiter/${magicToken}`);
export const icsUrl = (token: string) => link(`/api/seat/${token}/ics`);
/** Persönliche Tisch6-App (Web-App mit Benachrichtigungen) */
export const appUrl = (magicToken: string) => link(`/de/app/${magicToken}`);
const accountUrl = () => link("/de/konto");
/** Aufrufe mit einem Klick abbestellen (signierter Link je Person, siehe lib/campaigns.ts) */
export const optOutUrl = (token: string) => link(`/de/aufrufe/${token}`);
/** Dasselbe direkt aus dem Postfach („Abbestellen“ neben dem Absender, List-Unsubscribe-Post): ein POST, keine Rückfrage */
const optOutPostUrl = (token: string) => link(`/api/aufrufe/${token}`);
/** Persönlicher Einladungslink (wie im Konto); source markiert, über welchen Aufruf er kam */
export const inviteUrl = (code: string, source?: string) => link(`/de/bewerben?mit=${code}${source ? `&utm_source=${source}` : ""}`);
/** Angefangene Bewerbung fortsetzen: Anmeldung per SMS-Code, dann geht es dort weiter, wo die Person aufgehört hat */
const resumeUrl = () => link("/de/bewerben?weiter=1");

/** Reservierungsname im Lokal */
export const RESERVATION_NAME = "Tisch6";
const INSTAGRAM_NOTE = "Folge uns auf Instagram (@tischsechs) – dort zeigen wir, wie die Abende ablaufen. Und kennst du Singles, die auch hin müssen? Schick ihnen deinen Einladungslink aus deinem Konto.";
const BILL_NOTE = "Essen und Getränke zahlt ihr direkt im Lokal – jeder seine eigene Rechnung, also nur das, was er selbst bestellt hat.";

// ---------------------------------------------------------------------------
// Bewerbung
// ---------------------------------------------------------------------------

export function receivedMail(name: string): EmailContent {
  return layout({
    subject: "Deine Bewerbung ist da",
    title: `Danke, ${name} – deine Bewerbung ist da!`,
    paragraphs: [
      "Schön, dass du dabei sein willst. Wir schauen uns deine Bewerbung jetzt an – innerhalb von 24 Stunden bekommst du eine Antwort per E-Mail.",
      "Wie es dann weitergeht: Unsere KI stellt einen Tisch mit fünf Menschen zusammen, die zu dir passen. Bezahlt wird erst, wenn dein Tisch steht.",
      "Damit nichts verloren geht: Speichere hallo@tisch6.at in deinen Kontakten. Ist diese E-Mail im Spam-Ordner gelandet, tipp dort auf „Kein Spam“ – dann kommen auch deine Einladung und alle weiteren Infos sicher an.",
    ],
    cta: { label: "Mein Konto", url: accountUrl() },
    after: [INSTAGRAM_NOTE],
  });
}

/** Bewerbung angefangen, Gespräch nicht abgeschlossen – höchstens zwei Erinnerungen, die zweite ist die letzte */
export function unfinishedMail(o: { name: string; stage: "foto" | "chat" | "mittendrin"; last: boolean }): EmailContent {
  const missing = {
    foto: "Es fehlen nur noch dein Foto – das sieht nur unser Team – und das kurze Kennenlern-Gespräch mit unserer KI-Gastgeberin.",
    chat: "Jetzt fehlt nur noch das kurze Kennenlern-Gespräch mit unserer KI-Gastgeberin. Sie wartet schon mit der ersten Frage auf dich – in rund zehn Minuten bist du fertig.",
    mittendrin: "Du bist schon mitten im Kennenlern-Gespräch mit unserer KI-Gastgeberin, es fehlen nur noch ein paar Fragen. Deine bisherigen Antworten sind gespeichert.",
  }[o.stage];
  return layout({
    subject: o.last ? "Letzte Erinnerung: deine Bewerbung bei Tisch6" : "Deine Bewerbung bei Tisch6 ist fast fertig",
    title: o.last ? `${o.name}, deine Bewerbung wartet noch` : `${o.name}, deine Bewerbung ist fast fertig`,
    paragraphs: [
      `Du hast deine Bewerbung bei Tisch6 angefangen. ${missing}`,
      "Erst wenn das Gespräch abgeschlossen ist, kann unsere KI einen Tisch für dich zusammenstellen.",
      "So geht es weiter: Link öffnen, mit deiner Handynummer anmelden (du bekommst einen SMS-Code) – und du machst genau dort weiter, wo du aufgehört hast.",
    ],
    cta: { label: "Jetzt weitermachen", url: resumeUrl() },
    after: [
      o.last
        ? "Das ist unsere letzte Erinnerung, danach schreiben wir dir nicht mehr. Möchtest du deine Angaben lieber löschen? Das geht in deinem Konto unter „Profil löschen“ – oder antworte einfach auf diese Mail."
        : "Keine Zeit oder keine Lust mehr? Dann ignoriere diese Mail einfach – wir erinnern dich höchstens noch ein Mal.",
    ],
  });
}

export function rejectedMail(name: string): EmailContent {
  return layout({
    subject: "Deine Bewerbung bei Tisch6",
    title: `Danke für deine Bewerbung, ${name}`,
    paragraphs: [
      "Wir haben uns deine Bewerbung genau angesehen und können dich diesmal leider nicht an einen unserer Tische einladen.",
      "Das ist kein Urteil über dich als Mensch – wir stellen jeden Tisch sehr bewusst zusammen, damit der Abend für alle sechs passt.",
      `Deine Angaben und dein Foto löschen wir in ${TIMING.rejectedRetentionDays} Tagen automatisch – sofort geht es in deinem Konto unter „Profil löschen“.`,
    ],
  });
}

export function acceptedMail(name: string, fromWaitlist = false): EmailContent {
  return layout({
    subject: fromWaitlist ? "Gute Nachricht: Du bist bei Tisch6 dabei" : "Du bist dabei – willkommen bei Tisch6",
    title: fromWaitlist ? `Gute Nachricht, ${name}: Du bist dabei!` : `Willkommen am Tisch, ${name}!`,
    paragraphs: [
      fromWaitlist
        ? "Es ist so weit – du bist von der Warteliste nachgerückt."
        : "Schön, dass du dabei bist. Deine Bewerbung hat uns überzeugt.",
      "Wie es weitergeht: Unsere KI stellt jetzt einen Tisch mit fünf Menschen zusammen, die zu dir passen. Sobald er steht, bekommst du eine Einladung mit Datum und Lokal – an einem deiner Wunschtage.",
      "Bezahlt wird erst, wenn du eine Einladung annimmst.",
    ],
    cta: { label: "Mein Konto", url: accountUrl() },
    after: [INSTAGRAM_NOTE],
  });
}

export function waitlistMail(name: string, reason: "balance" | "format" | "review"): EmailContent {
  const middle = {
    balance:
      "Deine Bewerbung hat uns gefallen. Damit an jedem Tisch drei Frauen und drei Männer sitzen, nehmen wir gerade nicht alle sofort auf. Sobald es passt, rückst du automatisch nach – du musst nichts weiter tun.",
    format:
      "Unsere Tische sind im Moment für drei Frauen und drei Männer gedacht, die sich gegenseitig kennenlernen wollen. Für das, was du suchst, planen wir eigene Tische – wir melden uns, sobald es so weit ist.",
    review: "Wir schauen uns deine Bewerbung noch etwas genauer an und melden uns bei dir.",
  }[reason];
  return layout({
    subject: "Deine Bewerbung bei Tisch6",
    title: `Danke, ${name} – du stehst auf der Warteliste`,
    paragraphs: [middle, "Schön, dass du dabei sein willst. Bis bald!"],
  });
}

export function minorMail(name: string): EmailContent {
  return layout({
    subject: "Deine Bewerbung bei Tisch6",
    title: `Danke für dein Interesse, ${name}`,
    paragraphs: [
      "Tisch6 ist leider erst ab 18 Jahren. Deine Angaben und dein Foto haben wir deshalb gelöscht.",
      "Wir freuen uns, wenn du später wiederkommst!",
    ],
  });
}

export function lebenszeichenMail(name: string): EmailContent {
  return layout({
    subject: "Wir suchen noch die richtigen fünf für dich",
    title: "Wir suchen noch die richtigen fünf für dich",
    paragraphs: [
      `Kein Grund zur Sorge, ${name}: Wir haben dich nicht vergessen.`,
      "Wir stellen deinen Tisch erst zusammen, wenn er wirklich passt – lieber ein paar Tage später als ein Abend, der nur halb funktioniert. Sobald es so weit ist, bekommst du deine Einladung.",
    ],
    cta: { label: "Mein Konto", url: accountUrl() },
  });
}

// ---------------------------------------------------------------------------
// Einladung, Nachrücker, Bestätigung
// ---------------------------------------------------------------------------

export function invitationMail(o: {
  name: string;
  dinner: DinnerInfo;
  table: string;
  priceText: string;
  deadline: Date;
  token: string;
  replacement: boolean;
}): EmailContent {
  return layout({
    subject: o.replacement
      ? `Ein Platz ist frei geworden – ${formatDate(o.dinner.startsAt)}`
      : `Dein Tisch ist gedeckt – ${formatDate(o.dinner.startsAt)}`,
    title: o.replacement ? `Ein Platz ist frei geworden, ${o.name}!` : `Dein Tisch ist gedeckt, ${o.name}!`,
    paragraphs: [
      o.replacement
        ? "An einem Tisch, der gut zu dir passt, ist kurzfristig ein Platz frei geworden."
        : "Wir haben fünf Menschen gefunden, die gut zu dir passen. Hier die Eckdaten:",
    ],
    details: [
      ["Wann", formatDateTime(o.dinner.startsAt)],
      ["Wo", place(o.dinner)],
      ["Am Tisch", o.table],
      ["Preis", o.priceText],
    ],
    cta: { label: "Einladung ansehen", url: seatUrl(o.token) },
    after: [
      `Bitte sag bis ${formatDateTime(o.deadline)} zu – erst mit der Zahlung ist dein Platz fix.`,
      BILL_NOTE,
    ],
  });
}

/** Einladung noch offen: eine Erinnerung zur Halbzeit der Zusagefrist */
export function inviteReminderMail(o: {
  name: string;
  dinner: DinnerInfo;
  priceText: string;
  deadline: Date;
  token: string;
  confirmed: number;
}): EmailContent {
  return layout({
    subject: `Erinnerung: Dein Tisch am ${formatDate(o.dinner.startsAt)}`,
    title: `Dein Platz wartet noch, ${o.name}`,
    paragraphs: [
      `Deine Einladung zu einem Tisch6-Abend ist noch offen – fix ist dein Platz erst mit der Zahlung. Wir halten ihn bis ${formatDateTime(o.deadline)} für dich frei, danach geht er an jemand anderen.`,
      ...(o.confirmed > 0 ? [`${o.confirmed === 1 ? "Eine Person hat" : `${o.confirmed} Personen haben`} schon fix zugesagt.`] : []),
    ],
    details: [
      ["Wann", formatDateTime(o.dinner.startsAt)],
      ["Wo", place(o.dinner)],
      ["Preis", o.priceText],
    ],
    cta: { label: "Jetzt zusagen", url: seatUrl(o.token) },
    after: ["Du kannst nicht? Dann sag auf derselben Seite kurz ab – so kann jemand anderes nachrücken.", BILL_NOTE],
  });
}

export function inviteReminderSms(o: { dinner: DinnerInfo; deadline: Date; token: string }) {
  return `Tisch6: Dein Platz am ${formatShortDate(o.dinner.startsAt)} um ${formatTime(o.dinner.startsAt)} Uhr ist noch für dich reserviert, fix aber erst mit der Zahlung. Bitte bis ${formatShortDate(o.deadline)}, ${formatTime(o.deadline)} Uhr zusagen: ${seatUrl(o.token)}`;
}

export function replacementSms(o: { dinner: DinnerInfo; token: string }) {
  return `Tisch6: Ein Platz ist frei geworden! ${formatShortDate(o.dinner.startsAt)}, ${formatTime(o.dinner.startsAt)} Uhr. Du hast ${TIMING.replacementHours} Std. Zeit zum Zusagen: ${seatUrl(o.token)}`;
}

export function confirmedMail(o: { name: string; dinner: DinnerInfo; token: string; appToken: string }): EmailContent {
  const freeUntil = new Date(o.dinner.startsAt.getTime() - TIMING.freeCancelHoursBefore * 3600_000);
  return layout({
    subject: `Du bist dabei – ${formatDate(o.dinner.startsAt)}`,
    title: `Dein Platz ist fix, ${o.name}!`,
    paragraphs: ["Wir freuen uns auf dich. Hier alles Wichtige:"],
    details: [
      ["Wann", formatDateTime(o.dinner.startsAt)],
      ["Wo", o.dinner.restaurant],
      ["Adresse", o.dinner.address],
    ],
    cta: { label: "In den Kalender eintragen", url: icsUrl(o.token) },
    after: [
      "Vor dem Abend bekommst du Erinnerungen – und am Tag selbst eure Gesprächskarte mit Fragen für den Tisch.",
      `Tipp: Hol dir Tisch6 als App aufs Handy – dann kommen die Erinnerungen als Nachricht: ${appUrl(o.appToken)}`,
      BILL_NOTE,
      `Falls etwas dazwischenkommt: Bis ${formatDateTime(freeUntil)} kannst du kostenlos absagen – über deine Einladung: ${seatUrl(o.token)}`,
    ],
  });
}

/** Hinweis auf die Tisch6-App für Gäste, die schon fix dabei sind */
export function appInviteMail(o: { name: string; dinner: DinnerInfo; appToken: string }): EmailContent {
  return layout({
    subject: "Neu: Tisch6 als App auf deinem Handy",
    title: `Tisch6 jetzt als App, ${o.name}`,
    paragraphs: [
      `Vor deinem Abend am ${formatDate(o.dinner.startsAt)}, bekommst du Erinnerungen und am Tag selbst die Infos zu eurem Tisch. Mit der Tisch6-App kommen sie als Nachricht direkt aufs Handy – ganz ohne App Store.`,
    ],
    lists: [
      {
        title: "So geht's – dauert eine Minute",
        items: [
          "Tippe unten auf den Knopf – am iPhone öffnest du den Link in Safari.",
          "iPhone: auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen. Android: im Menü auf „App installieren“.",
          "Öffne Tisch6 über das neue Symbol und schalte die Benachrichtigungen ein.",
        ],
      },
    ],
    cta: { label: "Tisch6-App einrichten", url: appUrl(o.appToken) },
    after: ["E-Mails bekommst du weiterhin – die App ist eine Ergänzung."],
  });
}

/** Alle sechs haben bezahlt */
export function tableCompleteMail(o: { name: string; dinner: DinnerInfo; token: string }): EmailContent {
  return layout({
    subject: `Euer Tisch ist komplett – ${formatDate(o.dinner.startsAt)}`,
    title: `Alle sechs sind dabei, ${o.name}!`,
    paragraphs: ["Alle Plätze an deinem Tisch sind bestätigt. Jetzt fehlt nur noch der Abend."],
    details: [
      ["Wann", formatDateTime(o.dinner.startsAt)],
      ["Wo", o.dinner.restaurant],
      ["Adresse", o.dinner.address],
      ["Reserviert auf", RESERVATION_NAME],
    ],
    cta: { label: "Deine Einladung", url: seatUrl(o.token) },
  });
}

export function seatGoneMail(o: { name: string; refunded: string | null; packageKept: boolean }): EmailContent {
  return layout({
    subject: "Dein Platz war leider schon vergeben",
    title: `Das tut uns leid, ${o.name}!`,
    paragraphs: [
      "Deine Zahlung kam an, als der Platz bereits weitergegeben war.",
      o.packageKept
        ? "Dein Gründungspaket bleibt natürlich gültig – alle drei Tischteilnahmen stehen dir zur Verfügung."
        : (o.refunded ?? "Wir erstatten dir den Betrag automatisch."),
      "Wir stellen dir so bald wie möglich einen neuen Tisch zusammen.",
    ],
  });
}

export function expiredMail(name: string): EmailContent {
  return layout({
    subject: "Deine Einladung ist abgelaufen",
    title: `Schade, ${name}!`,
    paragraphs: [
      "Diesmal hat es mit der Zusage nicht geklappt – die Einladung ist abgelaufen und der Platz geht an jemand anderen.",
      "Kein Problem: Wir stellen dir einen neuen Tisch zusammen.",
    ],
  });
}

// ---------------------------------------------------------------------------
// Erinnerungen
// ---------------------------------------------------------------------------

export function reminder3dMail(o: { name: string; dinner: DinnerInfo; token: string }): EmailContent {
  const freeUntil = new Date(o.dinner.startsAt.getTime() - TIMING.freeCancelHoursBefore * 3600_000);
  return layout({
    subject: "Dein Tisch6-Abend rückt näher",
    title: `Bald ist es so weit, ${o.name}!`,
    paragraphs: [`Nur zur Erinnerung: Dein Tisch wartet am ${formatDateTime(o.dinner.startsAt)}.`],
    details: [
      ["Wo", o.dinner.restaurant],
      ["Adresse", o.dinner.address],
    ],
    cta: { label: "Deine Einladung", url: seatUrl(o.token) },
    after: [`Kommt doch etwas dazwischen? Bis ${formatDateTime(freeUntil)} kannst du noch kostenlos absagen.`],
  });
}

export function reminder1dMail(o: { name: string; dinner: DinnerInfo; token: string }): EmailContent {
  return layout({
    subject: "Morgen ist dein Tisch6-Abend",
    title: `Morgen ist es so weit, ${o.name}!`,
    paragraphs: [
      `Morgen um ${formatTime(o.dinner.startsAt)} Uhr im ${o.dinner.restaurant}, ${o.dinner.address}. Reserviert ist auf den Namen „${RESERVATION_NAME}“.`,
      "Am Tag selbst bekommst du eure Gesprächskarte – drei Runden Fragen, vom Aperitif bis zum Dessert.",
    ],
    cta: { label: "Deine Einladung", url: seatUrl(o.token) },
    after: ["Tipp: Einfach da sein und neugierig bleiben. Den Rest macht der Abend."],
  });
}

const FIRST_ARRIVAL = `Als Erste:r da? Sag einfach, dass du zu „${RESERVATION_NAME}“ gehörst – der Tisch ist auf diesen Namen reserviert. Setz dich ruhig schon hin und bestell dir etwas zu trinken, die anderen kommen gleich.`;

export function reminder2hMail(o: { name: string; dinner: DinnerInfo; token: string }): EmailContent {
  return layout({
    subject: "In zwei Stunden geht's los",
    title: `Gleich geht's los, ${o.name}!`,
    paragraphs: ["In zwei Stunden sitzt du am Tisch. Hier alles für den Weg:"],
    details: [
      ["Wann", `${formatTime(o.dinner.startsAt)} Uhr`],
      ["Wo", o.dinner.restaurant],
      ["Adresse", o.dinner.address],
      ["Reserviert auf", RESERVATION_NAME],
    ],
    after: [FIRST_ARRIVAL, "Schönen Abend!"],
    cta: { label: "Deine Einladung", url: seatUrl(o.token) },
  });
}

export function reminder2hSms(o: { dinner: DinnerInfo }) {
  return `Tisch6: In 2 Std. geht's los! ${formatTime(o.dinner.startsAt)} Uhr, ${o.dinner.restaurant}, ${o.dinner.address}. Reserviert auf ${RESERVATION_NAME} - als Erste/r da? Einfach nach ${RESERVATION_NAME} fragen und Platz nehmen.`;
}

/** Am Tag des Tisches: Gesprächskarte (und Notfallnummer, falls hinterlegt) */
export function dayOfMail(o: {
  name: string;
  dinner: DinnerInfo;
  token: string;
  card: { runden: { name: string; fragen: string[] }[] };
  emergency: string | null;
}): EmailContent {
  return layout({
    subject: "Heute Abend: eure Gesprächskarte",
    title: `Heute ist euer Abend, ${o.name}!`,
    paragraphs: [
      `Um ${formatTime(o.dinner.startsAt)} Uhr im ${o.dinner.restaurant}, ${o.dinner.address} – reserviert auf „${RESERVATION_NAME}“.`,
      "Damit das Gespräch von selbst läuft, bekommt euer Tisch diese Karte. Drei Runden – vom leichten Aperitif bis zur tiefen Dessertfrage:",
    ],
    lists: o.card.runden.map((r) => ({ title: r.name, items: r.fragen })),
    after: [
      ...CARD_RULES,
      ...(o.emergency ? [`Falls heute etwas ist – Verspätung, Lokal nicht gefunden, ungutes Gefühl: Unsere Notfallnummer ist ${o.emergency}.`] : []),
    ],
    cta: { label: "Deine Einladung", url: seatUrl(o.token) },
  });
}

/** Die zwei Regeln auf jeder Gesprächskarte */
export const CARD_RULES = ["Jeder am Tisch antwortet, dann kommt die nächste Frage.", "Frag nach. Das wirkt mehr als jede Geschichte."];

export function emergencySms(o: { dinner: DinnerInfo; phone: string }) {
  return `Tisch6: Heute ist dein Abend! Falls unterwegs etwas ist (Verspätung, Lokal nicht gefunden, ungutes Gefühl): Notfallnummer ${o.phone}. Wir sind für dich da.`;
}

// ---------------------------------------------------------------------------
// Verschiebung, Absage
// ---------------------------------------------------------------------------

/** Gezahlt wurde schon: Die Tischteilnahme bleibt als Guthaben erhalten. */
export function creditKeptText() {
  return "Deine Tischteilnahme bleibt dir als Guthaben erhalten – bei deiner nächsten Einladung sagst du einfach mit einem Klick zu. Lieber das Geld zurück? Antworte kurz auf diese E-Mail.";
}

export function dinnerMovedMail(o: { name: string; before: DinnerInfo; after: DinnerInfo; token: string; wasConfirmed: boolean }): EmailContent {
  return layout({
    subject: `Neuer Termin für deinen Tisch – ${formatDate(o.after.startsAt)}`,
    title: `Euer Tisch wurde verschoben, ${o.name}`,
    paragraphs: ["Wir mussten euren Abend leider verschieben – das tut uns leid! Hier der neue Termin:"],
    details: [
      ["Neu", formatDateTime(o.after.startsAt)],
      ["Wo", place(o.after)],
      ["Statt", formatDateTime(o.before.startsAt)],
    ],
    after: [
      o.wasConfirmed
        ? "Dein Platz bleibt für den neuen Termin reserviert. Passt er dir nicht, sag einfach über deine Einladung ab – das kostet dich nichts, du bekommst alles zurück."
        : "Deine Einladung gilt für den neuen Termin.",
    ],
    cta: { label: "Deine Einladung", url: seatUrl(o.token) },
  });
}

export function dinnerMovedSms(o: { before: DinnerInfo; after: DinnerInfo }) {
  return `Tisch6: Euer Tisch am ${formatShortDate(o.before.startsAt)} wurde verschoben auf ${formatShortDate(o.after.startsAt)}, ${formatTime(o.after.startsAt)} Uhr, ${o.after.restaurant}. Passt es nicht, kannst du kostenlos absagen. Infos per E-Mail.`;
}

export function cancelledMail(o: { name: string; dinner: DinnerInfo; refund: string | null }): EmailContent {
  return layout({
    subject: "Deine Absage ist angekommen",
    title: `Schade, ${o.name}!`,
    paragraphs: [
      `Deine Absage für den ${formatDate(o.dinner.startsAt)} ist angekommen.`,
      o.refund ??
        `Da die Absage weniger als ${TIMING.freeCancelHoursBefore} Stunden vor dem Dinner kam, können wir die Gebühr leider nicht erstatten.`,
      "Möchtest du wieder an einen Tisch? In deinem Konto kannst du jederzeit sagen, dass du wieder dabei bist.",
    ],
    cta: { label: "Mein Konto", url: accountUrl() },
  });
}

/** Vom Team storniert bzw. zurückgezogen (Adminbereich) */
export function seatRemovedMail(o: { name: string; dinner: DinnerInfo; refund: string | null; wasConfirmed: boolean }): EmailContent {
  return layout({
    subject: o.wasConfirmed ? "Dein Platz wurde storniert" : "Deine Einladung ist hinfällig",
    title: `Eine Änderung für dich, ${o.name}`,
    paragraphs: [
      o.wasConfirmed
        ? `Wir mussten deinen Platz für den ${formatDate(o.dinner.startsAt)} leider stornieren. Das tut uns leid!`
        : `Deine Einladung für den ${formatDate(o.dinner.startsAt)} ist leider hinfällig – du musst nichts tun.`,
      ...(o.wasConfirmed ? [o.refund ?? "Für dich fallen dadurch keine Kosten an."] : []),
      "Wir stellen dir so bald wie möglich einen neuen Tisch zusammen.",
    ],
    cta: { label: "Mein Konto", url: accountUrl() },
  });
}

/** Das ganze Dinner fällt aus – vom Team abgesagt oder 24 Stunden vorher zu wenige Zusagen */
export function dinnerCancelledMail(o: {
  name: string;
  dinner: DinnerInfo;
  refund: string | null;
  wasConfirmed: boolean;
  reason: "team" | "zu_wenige";
}): EmailContent {
  return layout({
    subject: "Dein Tisch fällt leider aus",
    title: `Dein Tisch fällt leider aus, ${o.name}`,
    paragraphs: [
      o.reason === "zu_wenige"
        ? `Für den Abend am ${formatDate(o.dinner.startsAt)} haben bis 24 Stunden vorher leider weniger als fünf Personen zugesagt. Lieber sagen wir ab, als einen halben Tisch zu decken.`
        : `Den Abend am ${formatDate(o.dinner.startsAt)} im ${place(o.dinner)} müssen wir leider absagen. Das tut uns sehr leid!`,
      ...(o.wasConfirmed ? [o.refund ?? "Für dich fallen dadurch keine Kosten an."] : ["Die Einladung ist damit hinfällig – du musst nichts tun."]),
      "Wir stellen dir so bald wie möglich einen neuen Tisch zusammen.",
    ],
    cta: { label: "Mein Konto", url: accountUrl() },
  });
}

export function dinnerCancelledSms(o: { dinner: DinnerInfo; wasConfirmed: boolean }) {
  return `Tisch6: Euer Tisch am ${formatShortDate(o.dinner.startsAt)} muss leider ausfallen.${o.wasConfirmed ? " Deine Tischteilnahme bleibt dir erhalten." : ""} Alle Infos per E-Mail.`;
}

export function blockedMail(o: { name: string; refund: string | null }): EmailContent {
  return layout({
    subject: "Dein Tisch6-Profil ist gesperrt",
    title: `Dein Profil ist gesperrt, ${o.name}`,
    paragraphs: [
      "Wir haben dein Tisch6-Profil gesperrt. Du bekommst deshalb keine Einladungen mehr; offene Plätze haben wir freigegeben.",
      ...(o.refund ? [o.refund] : []),
      "Wenn du denkst, dass das ein Irrtum ist, antworte einfach auf diese E-Mail.",
    ],
  });
}

export function creditMail(o: { name: string; seats: number }): EmailContent {
  const what = o.seats === 1 ? "eine Tischteilnahme" : `${o.seats} Tischteilnahmen`;
  return layout({
    subject: "Ein Geschenk von Tisch6",
    title: `Ein kleines Geschenk für dich, ${o.name}`,
    paragraphs: [
      `Wir haben dir ${what} gutgeschrieben – 12 Monate gültig.`,
      "Bei deiner nächsten Einladung kannst du damit mit einem Klick zusagen, ganz ohne zu bezahlen.",
    ],
    cta: { label: "Mein Konto", url: accountUrl() },
  });
}

export function discountMail(o: { name: string; cents: number }): EmailContent {
  return layout({
    subject: "Deine nächste Tischteilnahme ist günstiger",
    title: `Gute Nachricht, ${o.name}`,
    paragraphs: [`Deine nächste Tischteilnahme kostet nur ${euro(o.cents)} statt ${euro(PRICES.seat)}. Der Rabatt wird bei deiner nächsten Einladung automatisch abgezogen.`],
    cta: { label: "Mein Konto", url: accountUrl() },
  });
}

export function refundMail(o: { name: string; cents: number }): EmailContent {
  return layout({
    subject: "Wir haben dir Geld erstattet",
    title: `Erstattung für dich, ${o.name}`,
    paragraphs: [`Wir haben dir ${euro(o.cents)} erstattet. Je nach Bank ist der Betrag in ein paar Tagen auf deinem Konto.`],
  });
}

export function refundText(o: { cents: number | null; package: boolean }) {
  if (o.package) return "Die Tischteilnahme ist wieder in deinem Paket gutgeschrieben.";
  if (o.cents) return `Deine Zahlung von ${euro(o.cents)} bekommst du automatisch zurück – je nach Bank dauert das ein paar Tage.`;
  return null;
}

// ---------------------------------------------------------------------------
// Nach dem Dinner
// ---------------------------------------------------------------------------

export function feedbackRequestMail(o: { name: string; token: string }): EmailContent {
  return layout({
    subject: "Wie war dein Abend?",
    title: `Wie war dein Abend, ${o.name}?`,
    paragraphs: [
      "Wir hoffen, du hattest einen schönen Abend! Jetzt die spannende Frage: Wen möchtest du wiedersehen?",
      "Deine Angabe ist anonym – Kontakt gibt es nur, wenn es beidseitig ist. Dazu drei kurze Fragen, damit der nächste Tisch noch besser passt. Dauert eine Minute.",
    ],
    cta: { label: "Wiedersehen & Feedback", url: feedbackUrl(o.token) },
  });
}

export function matchMail(o: { name: string; other: string; email: string; phone: string | null }): EmailContent {
  return layout({
    subject: "Ihr wollt euch wiedersehen!",
    title: `Es hat gefunkt, ${o.name}!`,
    paragraphs: [`${o.other} möchte dich auch wiedersehen. Hier sind die Kontaktdaten:`],
    details: [["E-Mail", o.email], ...(o.phone ? ([["Telefon", o.phone]] as [string, string][]) : [])],
    after: ["Wir wünschen euch ein schönes Wiedersehen!"],
  });
}

export function followUpMail(o: { name: string; magicToken: string; again: boolean }): EmailContent {
  return layout({
    subject: o.again ? "Dein nächster Tisch wartet" : "Lust auf einen neuen Tisch?",
    title: o.again ? `Dein nächster Tisch wartet, ${o.name}` : `Lust auf einen neuen Tisch, ${o.name}?`,
    paragraphs: o.again
      ? ["Wir decken laufend neue Tische – und einer davon könnte genau der richtige für dich sein."]
      : [
          "Diesmal war kein Wiedersehen dabei – das ist völlig normal. Jeder Tisch ist anders, und der nächste kann genau der richtige sein.",
        ],
    cta: { label: "Ja, ich bin wieder dabei", url: rejoinUrl(o.magicToken) },
    after: ["Ein Klick genügt – wir melden uns, sobald dein nächster Tisch steht."],
  });
}

export function referralRewardMail(name: string): EmailContent {
  return layout({
    subject: "Danke fürs Weiterempfehlen!",
    title: `Danke fürs Weiterempfehlen, ${name}!`,
    paragraphs: [
      "Jemand, den du zu Tisch6 eingeladen hast, saß gerade an einem unserer Tische.",
      `Als Dankeschön kostet deine nächste Tischteilnahme nur ${euro(PRICES.referral)} statt ${euro(PRICES.seat)}.`,
    ],
  });
}

/** Aufruf an Wartende (CAMPAIGNS): den eigenen Einladungslink an passende Singles weiterschicken */
export function campaignMail(o: { name: string; campaign: Campaign; inviteCode: string; optOutToken: string }): EmailContent {
  const url = inviteUrl(o.inviteCode, "aufruf");
  const mail = layout({
    subject: "Hilf mit, dass dein Tisch zustande kommt",
    title: `Dein Tisch braucht noch Verstärkung, ${o.name}`,
    paragraphs: [
      o.campaign.lead ?? `Wir stellen gerade die nächsten Tische zusammen. Damit dein Tisch zustande kommt, fehlen uns noch ${o.campaign.missing}.`,
      o.campaign.ask,
      url,
    ],
    cta: { label: "Per WhatsApp weiterschicken", url: `https://wa.me/?text=${encodeURIComponent(`${o.campaign.share} ${url}`)}` },
    after: [
      "Keine Sorge: Ihr sitzt nie am selben Tisch.",
      `Kommt jemand über deinen Link an einen Tisch, kostet dein nächster Tisch nur ${euro(PRICES.referral)} statt ${euro(PRICES.seat)}.`,
      "Du möchtest solche Hinweise nicht mehr? Ganz unten in dieser E-Mail kannst du sie mit einem Klick abbestellen.",
    ],
    footerLink: { label: "Keine solchen Hinweise mehr – hier abbestellen", url: optOutUrl(o.optOutToken) },
  });
  // Gmail, Outlook und GMX zeigen damit „Abbestellen“ neben dem Absender – wer keine Aufrufe will, drückt das statt „Spam“
  return { ...mail, headers: { "List-Unsubscribe": `<${optOutPostUrl(o.optOutToken)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}

export function fivePersonMail(name: string): EmailContent {
  return layout({
    subject: "Ein kleines Dankeschön",
    title: `Danke für deine Geduld, ${name}`,
    paragraphs: [
      "Bei deinem letzten Tisch ist leider jemand ausgefallen, und ihr wart nicht vollzählig.",
      `Als kleines Dankeschön kostet deine nächste Tischteilnahme nur ${euro(PRICES.fivePerson)} statt ${euro(PRICES.seat)}.`,
    ],
  });
}

export function noShowMail(o: { name: string; dinner: DinnerInfo; blocked: boolean }): EmailContent {
  return o.blocked
    ? layout({
        subject: "Dein Tisch6-Profil ist gesperrt",
        title: `Dein Profil ist gesperrt, ${o.name}`,
        paragraphs: [
          "Du bist zweimal ohne Absage nicht zu einem Dinner gekommen. Damit sich alle Gäste auf jeden Platz verlassen können, haben wir dein Profil gesperrt.",
          "Wenn du denkst, dass das ein Irrtum ist, antworte einfach auf diese E-Mail.",
        ],
      })
    : layout({
        subject: "Wir haben dich vermisst",
        title: `Wir haben dich vermisst, ${o.name}`,
        paragraphs: [
          `Beim Dinner am ${formatDate(o.dinner.startsAt)} warst du leider nicht da. Die Gebühr verfällt damit.`,
          "Bitte sag beim nächsten Mal ab, wenn etwas dazwischenkommt – dann kann jemand nachrücken. Beim zweiten Mal ohne Absage müssten wir dein Profil sperren.",
        ],
      });
}

// ---------------------------------------------------------------------------
// Lokal und Team
// ---------------------------------------------------------------------------

export function reservationMail(o: { dinner: DinnerInfo; count: number; kitchen: string[]; update: boolean }): EmailContent {
  return layout({
    subject: `${o.update ? "Änderung" : "Reservierung"} Tisch6: ${formatDate(o.dinner.startsAt)}, ${o.count} Personen`,
    title: o.update ? "Änderung unserer Reservierung" : "Reservierung für Tisch6",
    paragraphs: [
      `Hallo liebes Team vom ${o.dinner.restaurant},`,
      o.update
        ? "bei unserer Tisch6-Runde hat sich die Personenzahl geändert:"
        : "wie vereinbart reservieren wir einen Tisch für unsere Tisch6-Runde:",
    ],
    details: [
      ["Datum", formatDateTime(o.dinner.startsAt)],
      ["Personen", String(o.count)],
      ["Reserviert auf", RESERVATION_NAME],
      ["Hinweise für die Küche", o.kitchen.length ? o.kitchen.join(", ") : "keine"],
    ],
    after: [
      "Eine Bitte: Rechnet am Ende bitte getrennt ab – jeder Gast zahlt nur, was er selbst bestellt hat.",
      "Vielen Dank – wir freuen uns auf den Abend bei euch!",
    ],
  });
}

export function reservationCancelledMail(o: { dinner: DinnerInfo }): EmailContent {
  return layout({
    subject: `Storno Tisch6: ${formatDate(o.dinner.startsAt)}`,
    title: "Storno unserer Reservierung",
    paragraphs: [
      `Hallo liebes Team vom ${o.dinner.restaurant},`,
      `leider müssen wir unsere Tisch6-Reservierung für ${formatDateTime(o.dinner.startsAt)} absagen. Bitte gebt den Tisch frei – danke und entschuldigt die Umstände!`,
    ],
  });
}

export function adminMail(subject: string, lines: string[]): EmailContent {
  return layout({ subject: `[Tisch6] ${subject}`, title: subject, paragraphs: lines });
}
