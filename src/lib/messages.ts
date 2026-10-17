import { PRICES, TIMING, euro } from "./config";
import { siteUrl } from "./site";
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
  list?: { title: string; items: string[] };
  cta?: { label: string; url: string };
  after?: string[];
};

function layout(o: Layout): EmailContent {
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const p = (t: string) => `<p style="${font}font-size:16px;line-height:1.6;color:#c9cde0;margin:0 0 14px;">${esc(t)}</p>`;
  const details = o.details?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:6px 0 18px;background:#0a1128;border-radius:14px;">${o.details
        .map(
          ([k, v]) =>
            `<tr><td style="${font}padding:10px 16px;font-size:13px;color:#a7aed0;width:34%;vertical-align:top;">${esc(k)}</td><td style="${font}padding:10px 16px;font-size:15px;color:#eef0fa;">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const list = o.list
    ? `<div style="margin:6px 0 18px;padding:16px 18px;border:1px solid #e88fa3;border-radius:14px;"><div style="${font}font-size:13px;color:#f4b6c2;font-weight:bold;margin-bottom:8px;">${esc(o.list.title)}</div>${o.list.items
        .map((item, i) => `<div style="${font}font-size:15px;line-height:1.5;color:#eef0fa;margin:6px 0;">${i + 1}. ${esc(item)}</div>`)
        .join("")}</div>`
    : "";
  const cta = o.cta
    ? `<div style="margin:22px 0 8px;"><a href="${esc(o.cta.url)}" style="${font}display:inline-block;background:#f4b6c2;color:#0a1128;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 26px;border-radius:999px;">${esc(o.cta.label)}</a></div>`
    : "";
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.subject)}</title></head>
<body style="margin:0;padding:0;background:#0a1128;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader ?? o.paragraphs[0] ?? "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a1128;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111a3a;border:1px solid #26336a;border-radius:20px;">
<tr><td style="padding:30px 28px 10px;">
<div style="${font}font-size:20px;font-weight:bold;color:#eef0fa;">Tisch<span style="color:#f4b6c2;">6</span></div>
<h1 style="${font}font-size:24px;line-height:1.3;margin:22px 0 14px;color:#eef0fa;">${esc(o.title)}</h1>
${o.paragraphs.map(p).join("")}${details}${list}${cta}${(o.after ?? []).map(p).join("")}
</td></tr>
<tr><td style="${font}padding:12px 28px 26px;font-size:12px;line-height:1.5;color:#7d84a8;">Tisch6 · KI-kuratierte Dating-Dinner · Pilot in Wien<br><a href="${siteUrl()}" style="color:#7d84a8;">${esc(siteUrl().replace(/^https?:\/\//, ""))}</a></td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    o.title,
    "",
    ...o.paragraphs,
    ...(o.details ?? []).map(([k, v]) => `${k}: ${v}`),
    ...(o.list ? ["", o.list.title, ...o.list.items.map((item, i) => `${i + 1}. ${item}`)] : []),
    ...(o.cta ? ["", `${o.cta.label}: ${o.cta.url}`] : []),
    ...(o.after?.length ? ["", ...o.after] : []),
    "",
    "Tisch6 · KI-kuratierte Dating-Dinner",
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
const accountUrl = () => link("/de/konto");

// ---------------------------------------------------------------------------
// Bewerbung
// ---------------------------------------------------------------------------

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
      `Bitte sag bis ${formatDateTime(o.deadline)} zu – erst mit der Zahlung ist dein Platz fix. Essen und Getränke zahlt jede Person selbst im Lokal.`,
    ],
  });
}

export function replacementSms(o: { dinner: DinnerInfo; token: string }) {
  return `Tisch6: Ein Platz ist frei geworden! ${formatShortDate(o.dinner.startsAt)}, ${formatTime(o.dinner.startsAt)} Uhr. Du hast ${TIMING.replacementHours} Std. Zeit zum Zusagen: ${seatUrl(o.token)}`;
}

export function confirmedMail(o: { name: string; dinner: DinnerInfo; token: string }): EmailContent {
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
      "Vor dem Dinner bekommst du Erinnerungen und deine Eisbrecher-Karte mit zwei Fragen für den Abend.",
      `Falls etwas dazwischenkommt: Bis ${formatDateTime(freeUntil)} kannst du kostenlos absagen – über deine Einladung: ${seatUrl(o.token)}`,
    ],
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

export function reminder1dMail(o: { name: string; dinner: DinnerInfo; token: string; icebreaker: string[] }): EmailContent {
  return layout({
    subject: "Morgen ist dein Tisch6-Abend",
    title: `Morgen ist es so weit, ${o.name}!`,
    paragraphs: [`Morgen um ${formatTime(o.dinner.startsAt)} Uhr im ${o.dinner.restaurant}, ${o.dinner.address}.`],
    list: o.icebreaker.length ? { title: "Deine Eisbrecher-Karte – zwei Fragen für den Abend", items: o.icebreaker } : undefined,
    cta: { label: "Deine Einladung", url: seatUrl(o.token) },
    after: ["Tipp: Einfach da sein und neugierig bleiben. Den Rest macht der Abend."],
  });
}

export function reminder1dSms(o: { dinner: DinnerInfo; token: string }) {
  return `Tisch6: Morgen um ${formatTime(o.dinner.startsAt)} Uhr im ${o.dinner.restaurant}, ${o.dinner.address}. Wir freuen uns auf dich! Deine Eisbrecher-Karte: ${seatUrl(o.token)}`;
}

export function reminder2hMail(o: { name: string; dinner: DinnerInfo; token: string }): EmailContent {
  return layout({
    subject: "In zwei Stunden geht's los",
    title: `Gleich geht's los, ${o.name}!`,
    paragraphs: [`Um ${formatTime(o.dinner.startsAt)} Uhr im ${o.dinner.restaurant}, ${o.dinner.address}. Schönen Abend!`],
    cta: { label: "Deine Einladung", url: seatUrl(o.token) },
  });
}

export function reminder2hSms(o: { dinner: DinnerInfo }) {
  return `Tisch6: In 2 Stunden geht's los - ${formatTime(o.dinner.startsAt)} Uhr im ${o.dinner.restaurant}, ${o.dinner.address}. Schönen Abend!`;
}

// ---------------------------------------------------------------------------
// Verschiebung, Absage
// ---------------------------------------------------------------------------

export function postponedMail(o: { name: string; dinner: DinnerInfo; refund: string | null }): EmailContent {
  return layout({
    subject: "Dein Tisch wird verschoben",
    title: `Dein Tisch wird verschoben, ${o.name}`,
    paragraphs: [
      `Für den Abend am ${formatDate(o.dinner.startsAt)} haben leider nicht genug Gäste zugesagt. Lieber verschieben wir, als einen halben Tisch zu decken.`,
      ...(o.refund ? [o.refund] : ["Die Einladung ist damit hinfällig – du musst nichts tun."]),
      "Wir stellen dir so bald wie möglich einen neuen Tisch zusammen.",
    ],
  });
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

/** Das ganze Dinner fällt aus (vom Team abgesagt) */
export function dinnerCancelledMail(o: { name: string; dinner: DinnerInfo; refund: string | null; wasConfirmed: boolean }): EmailContent {
  return layout({
    subject: "Dein Tisch fällt leider aus",
    title: `Dein Tisch fällt leider aus, ${o.name}`,
    paragraphs: [
      `Den Abend am ${formatDate(o.dinner.startsAt)} im ${place(o.dinner)} müssen wir leider absagen. Das tut uns sehr leid!`,
      ...(o.wasConfirmed ? [o.refund ?? "Für dich fallen dadurch keine Kosten an."] : ["Die Einladung ist damit hinfällig – du musst nichts tun."]),
      "Wir stellen dir so bald wie möglich einen neuen Tisch zusammen.",
    ],
    cta: { label: "Mein Konto", url: accountUrl() },
  });
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
      ["Hinweise für die Küche", o.kitchen.length ? o.kitchen.join(", ") : "keine"],
    ],
    after: ["Die Gäste bestellen und zahlen Essen und Getränke selbst. Vielen Dank – wir freuen uns auf den Abend bei euch!"],
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
