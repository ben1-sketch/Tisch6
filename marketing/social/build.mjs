// Erzeugt die Instagram-Bilder und -Reels im Tisch6-Design nach /public/social/
// und eine Übersicht mit Bildunterschriften nach marketing/social/manifest.json.
//
//   node marketing/social/build.mjs                 alles
//   node marketing/social/build.mjs reel-pov         nur einzelne IDs
//
// Braucht Playwright (Chromium) und ffmpeg auf dem Rechner.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ads, carousels, posts, reels, stories } from "./content.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, "public/social");
const TMP = path.join(HERE, ".render");
const SITE = "https://www.tisch6.at/social";
const FPS = 30;

const fontFile = (pkg, file) => pathToFileURL(path.join(ROOT, "node_modules/@fontsource-variable", pkg, "files", file)).href;
const photo = (file) => pathToFileURL(path.join(ROOT, "public/bilder", file)).href;

async function loadChromium() {
  try {
    return (await import("playwright")).chromium;
  } catch {
    const fallback = process.env.PLAYWRIGHT_MODULE ?? "/opt/node22/lib/node_modules/playwright/index.js";
    return (await import(pathToFileURL(fallback).href)).default.chromium;
  }
}

// ---------------------------------------------------------------------------
// Gestaltung – dieselben Farben und Schriften wie auf tisch6.at
// ---------------------------------------------------------------------------

const css = (w, h) => `
@font-face { font-family: "Cormorant"; src: url("${fontFile("cormorant-garamond", "cormorant-garamond-latin-wght-normal.woff2")}") format("woff2"); font-weight: 300 700; }
@font-face { font-family: "Cormorant"; src: url("${fontFile("cormorant-garamond", "cormorant-garamond-latin-wght-italic.woff2")}") format("woff2"); font-weight: 300 700; font-style: italic; }
@font-face { font-family: "Inter"; src: url("${fontFile("inter", "inter-latin-wght-normal.woff2")}") format("woff2"); font-weight: 100 900; }
:root { --night-950:#060913; --night-900:#0b1120; --night-800:#121a2e; --mist:#aab1c3; --cloud:#f4efe6; --gold-200:#f3e6c4; --gold-300:#e8d3a4; --gold-400:#d6b77a; --gold-500:#c09a57; --gold-600:#9c7a3e; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${w}px; height: ${h}px; overflow: hidden; background: var(--night-950); color: var(--cloud); font-family: "Inter", sans-serif; -webkit-font-smoothing: antialiased; }
.frame { position: relative; width: ${w}px; height: ${h}px; overflow: hidden; }
.layer { position: absolute; inset: 0; }
.photo { background-size: cover; background-position: center; transform-origin: 55% 45%; }
.glow { background:
  radial-gradient(ellipse 60% 45% at 78% 18%, rgb(214 183 122 / 0.16), transparent 70%),
  radial-gradient(ellipse 70% 55% at 15% 85%, rgb(40 50 85 / 0.55), transparent 70%),
  linear-gradient(180deg, var(--night-900), var(--night-950)); }
.eyebrow { font-weight: 500; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold-300); }
.display { font-family: "Cormorant", serif; font-weight: 500; line-height: 1.04; text-wrap: balance; }
.gold { font-style: italic; background: linear-gradient(100deg, var(--gold-200), var(--gold-400) 45%, var(--gold-500)); -webkit-background-clip: text; background-clip: text; color: transparent; padding-right: 0.08em; }
.ornament { display: flex; align-items: center; justify-content: center; gap: 22px; color: var(--gold-400); }
.ornament::before, .ornament::after { content: ""; height: 2px; width: 120px; background: linear-gradient(90deg, transparent, currentColor); }
.ornament::after { transform: scaleX(-1); }
.ornament span { width: 13px; height: 13px; transform: rotate(45deg); border: 2px solid currentColor; }
.brand { display: inline-flex; align-items: center; gap: 18px; font-family: "Cormorant", serif; letter-spacing: 0.02em; }
.brand i { font-style: italic; color: var(--gold-400); }
.pill { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--night-950);
  background: linear-gradient(135deg, var(--gold-300), var(--gold-400) 55%, var(--gold-500)); box-shadow: 0 18px 50px -20px rgb(214 183 122 / 0.7); }
`;

function logoMark(size) {
  const seats = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `<circle cx="${(32 + 21 * Math.cos(a)).toFixed(2)}" cy="${(32 + 21 * Math.sin(a)).toFixed(2)}" r="3.6" fill="${i % 2 ? "#d6b77a" : "#f4efe6"}"/>`;
  }).join("");
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}"><circle cx="32" cy="32" r="11.5" fill="none" stroke="#d6b77a" stroke-width="1.6"/><circle cx="32" cy="32" r="7.5" fill="none" stroke="#d6b77a" stroke-opacity="0.45" stroke-width="0.8"/>${seats}</svg>`;
}

const brand = (mark, text) => `<span class="brand" style="font-size:${text}px">${logoMark(mark)}<span>Tisch<i>6</i></span></span>`;
const page = (w, h, body, extraCss = "") => `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css(w, h)}${extraCss}</style></head><body>${body}</body></html>`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------------------
// Reels (1080×1920): Szenen blenden nacheinander ein, das Foto zoomt langsam
// ---------------------------------------------------------------------------

function reelHtml(reel) {
  const piece = (scene, at, html) => `<div class="el" data-from="${scene.from + at}" data-to="${scene.to}" data-cover="${scene.from === 0 && at === 0 ? 1 : 0}">${html}</div>`;
  const line = (scene, l) => {
    const o = typeof l === "string" ? { t: l } : l;
    return piece(scene, o.at ?? 0, `<div class="display r-line">${o.gold ? `<span class="gold">${esc(o.t)}</span>` : esc(o.t)}</div>`);
  };
  const scenes = reel.scenes
    .map((s) => {
      if (s.cta) {
        return `<section class="scene">${piece(s, 0, `<div class="cta-mark">${logoMark(170)}</div>`)}${piece(s, 0.2, `<div class="display r-line">Bewerbung</div>`)}${piece(s, 0.4, `<div class="display r-line"><span class="gold">kostenlos.</span></div>`)}${piece(s, 0.9, `<div class="pill r-pill">tisch6.at · Link in Bio</div>`)}</section>`;
      }
      const parts = [];
      if (s.eyebrow) parts.push(piece(s, 0, `<div class="eyebrow r-eyebrow">${esc(s.eyebrow)}</div>`));
      for (const l of s.lines ?? []) parts.push(line(s, l));
      if (s.list) {
        parts.push(
          `<ul class="r-list">${s.list.map((item) => `<li>${piece(s, item.at, `<span class="tick"></span><span>${esc(item.t)}</span>`)}</li>`).join("")}</ul>`,
        );
      }
      if (s.sub) parts.push(piece(s, s.sub.at ?? 0, `<div class="${s.sub.big ? "display r-price" : "r-sub"}">${esc(s.sub.t)}</div>`));
      if (s.sub2) parts.push(piece(s, s.sub2.at ?? 0, `<div class="r-sub">${esc(s.sub2.t)}</div>`));
      return `<section class="scene">${parts.join("")}</section>`;
    })
    .join("");

  const background = reel.bg
    ? `<div class="layer photo" id="bg" style="background-image:url('${photo(reel.bg)}')"></div><div class="layer shade"></div>`
    : `<div class="layer glow" id="bg"></div>`;

  const extra = `
.shade { background: linear-gradient(180deg, rgb(6 9 19 / 0.82) 0%, rgb(6 9 19 / 0.5) 30%, rgb(6 9 19 / 0.58) 62%, rgb(6 9 19 / 0.94) 100%),
  radial-gradient(ellipse at center, transparent 30%, rgb(6 9 19 / 0.55) 100%); }
.top { position: absolute; top: 210px; left: 0; right: 0; display: flex; justify-content: center; }
.scene { position: absolute; left: 70px; right: 70px; top: 380px; bottom: 560px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.el { opacity: 0; will-change: transform, opacity; }
.r-eyebrow { font-size: 32px; margin-bottom: 34px; }
.r-line { font-size: 112px; }
.r-sub { margin-top: 30px; font-size: 46px; line-height: 1.4; color: rgb(244 239 230 / 0.85); max-width: 860px; text-wrap: balance; }
.r-price { margin-top: 26px; font-size: 92px; color: var(--gold-300); }
.r-list { list-style: none; margin-top: 10px; display: flex; flex-direction: column; gap: 34px; align-items: stretch; text-align: left; }
.r-list li .el { display: flex; align-items: center; gap: 28px; font-size: 50px; line-height: 1.25; }
.tick { flex: none; width: 22px; height: 22px; transform: rotate(45deg); border: 2.5px solid var(--gold-400); background: rgb(214 183 122 / 0.18); }
.cta-mark { margin-bottom: 30px; }
.r-pill { margin-top: 56px; padding: 30px 54px; font-size: 32px; }
`;
  const script = `
const DURATION = ${reel.duration};
const els = [...document.querySelectorAll('.el')];
const bg = document.getElementById('bg');
const ease = (x) => 1 - Math.pow(1 - x, 3);
const clamp = (x) => Math.max(0, Math.min(1, x));
window.renderAt = (t) => {
  const p = t / DURATION;
  ${reel.bg ? "bg.style.transform = `scale(${1.06 + 0.12 * p}) translate(${-1.2 * p}%, ${0.8 * p}%)`;" : "bg.style.backgroundPosition = `${50 + 8 * Math.sin(p * Math.PI)}% ${50 - 6 * p}%`;"}
  for (const el of els) {
    const from = +el.dataset.from, to = +el.dataset.to;
    const fin = el.dataset.cover === '1' ? 1 : clamp((t - from) / 0.45);
    const fout = clamp((to - t) / 0.35);
    const o = Math.min(fin, fout);
    el.style.opacity = o;
    el.style.transform = 'translateY(' + ((1 - ease(fin)) * 38 - (1 - fout) * 14) + 'px)';
  }
};
window.renderAt(0);`;
  return page(1080, 1920, `<div class="frame">${background}<div class="top">${brand(64, 54)}</div>${scenes}</div><script>${script}</script>`, extra);
}

// ---------------------------------------------------------------------------
// Karussell-Folien und Einzelbilder (1080×1350)
// ---------------------------------------------------------------------------

const slideCss = `
.head { position: absolute; top: 84px; left: 88px; right: 88px; display: flex; justify-content: space-between; align-items: center; }
.count { font-size: 24px; color: rgb(232 211 164 / 0.8); }
.foot { position: absolute; bottom: 82px; left: 88px; right: 88px; display: flex; justify-content: space-between; align-items: center; }
.site { font-size: 24px; }
.hint { font-size: 24px; color: rgb(244 239 230 / 0.7); }
.body { position: absolute; left: 88px; right: 88px; top: 230px; bottom: 230px; display: flex; flex-direction: column; justify-content: center; }
.center { align-items: center; text-align: center; }
.c-eyebrow { font-size: 28px; }
.c-title { font-size: 122px; margin-top: 36px; }
.c-sub { margin-top: 46px; font-size: 40px; line-height: 1.45; color: var(--mist); max-width: 820px; text-wrap: balance; }
.numeral { font-family: "Cormorant", serif; font-style: italic; font-size: 210px; line-height: 0.9; color: var(--gold-400); }
.s-title { font-size: 92px; margin-top: 26px; }
.rule { width: 90px; height: 2px; background: rgb(214 183 122 / 0.6); margin: 46px 0; }
.s-text { font-size: 42px; line-height: 1.5; color: rgb(244 239 230 / 0.86); text-wrap: pretty; }
.l-title { font-size: 86px; margin-top: 30px; }
.l-list { list-style: none; margin-top: 56px; display: flex; flex-direction: column; gap: 30px; }
.l-list li { display: flex; align-items: center; gap: 26px; font-size: 40px; line-height: 1.3; color: rgb(244 239 230 / 0.9); }
.q-label { font-size: 26px; }
.q { font-size: 100px; margin-top: 30px; }
.cta-row { margin-top: 60px; }
.cta { white-space: nowrap; padding: 28px 48px; font-size: 26px; }
`;

function slideHtml(carousel, slide, index, total) {
  const head = `<div class="head">${brand(52, 44)}<span class="eyebrow count">${index + 1} / ${total}</span></div>`;
  const foot = `<div class="foot"><span class="eyebrow site">tisch6.at</span>${slide.hint ? `<span class="eyebrow hint">Wischen →</span>` : ""}</div>`;
  const cta = slide.cta ? `<div class="cta-row"><span class="pill cta">Bewerbung kostenlos · Link in Bio</span></div>` : "";
  let body = "";
  if (slide.kind === "cover") {
    body = `<div class="body center"><div class="eyebrow c-eyebrow">${esc(slide.eyebrow)}</div><div class="ornament" style="margin-top:34px"><span></span></div><div class="display c-title">${slide.title
      .map(esc)
      .join("<br>")}<br><span class="gold">${esc(slide.gold).replace("\n", "<br>")}</span></div>${slide.sub ? `<p class="c-sub">${esc(slide.sub)}</p>` : ""}${cta}</div>`;
  } else if (slide.kind === "step") {
    body = `<div class="body"><div class="numeral">${slide.n}</div><div class="display s-title">${esc(slide.title)}</div><div class="rule"></div><p class="s-text">${esc(slide.text)}</p>${cta}</div>`;
  } else if (slide.kind === "point") {
    body = `<div class="body"><div class="display s-title"><span class="gold">${esc(slide.title)}</span></div><div class="rule"></div><p class="s-text">${esc(slide.text)}</p></div>`;
  } else if (slide.kind === "list") {
    body = `<div class="body"><div class="eyebrow c-eyebrow">${esc(slide.eyebrow)}</div><div class="display l-title">${esc(slide.title)}</div><ul class="l-list">${slide.items
      .map((i) => `<li><span class="tick"></span><span>${esc(i)}</span></li>`)
      .join("")}</ul></div>`;
  } else if (slide.kind === "qa") {
    body = `<div class="body"><div class="eyebrow q-label">Frage</div><div class="display q">${esc(slide.q)}</div><div class="rule"></div><p class="s-text">${esc(slide.a)}</p>${cta}</div>`;
  }
  const tick = `.tick { flex: none; width: 20px; height: 20px; transform: rotate(45deg); border: 2.5px solid var(--gold-400); background: rgb(214 183 122 / 0.18); }`;
  return page(1080, 1350, `<div class="frame"><div class="layer glow"></div>${head}${body}${foot}</div>`, slideCss + tick);
}

function postHtml(post) {
  if (post.kind === "founder") {
    const extra = `
.wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 34px; }
.card { width: 900px; background: var(--cloud); color: var(--night-900); padding: 12px; box-shadow: 0 40px 90px -30px rgb(0 0 0 / 0.8); }
.card > div { border: 1.5px solid rgb(156 122 62 / 0.5); padding: 9px; }
.card > div > div { border: 1px solid rgb(156 122 62 / 0.25); padding: 58px 44px 54px; text-align: center; }
.k-eyebrow { font-size: 21px; color: var(--gold-600); }
.k-title { font-size: 98px; margin-top: 26px; }
.k-title i { color: var(--gold-600); }
.k-badge { font-size: 24px; color: var(--night-800); margin-top: 30px; }
.k-head { font-size: 108px; margin-top: 14px; line-height: 1; }
.k-price { font-size: 66px; margin-top: 18px; }
.k-price s { font-size: 42px; color: #283255; text-decoration-color: var(--gold-600); text-decoration-thickness: 2px; }
.k-small { font-size: 31px; color: #1b2440; margin-top: 12px; }
.k-points { margin-top: 28px; font-size: 30px; line-height: 1.75; color: #1b2440; }
.k-btn { display: inline-block; margin-top: 34px; padding: 26px 58px; border-radius: 999px; background: var(--night-900); color: var(--gold-200); font-size: 26px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; }
.k-site { font-size: 24px; }`;
    return page(
      1080,
      1350,
      `<div class="frame"><div class="layer glow"></div><div class="wrap">${brand(50, 42)}<div class="card"><div><div>
<div class="eyebrow k-eyebrow">Einladung · Die ersten 300 in Wien</div>
<div class="display k-title">Dein Platz<br>ist <i>reserviert.</i></div>
<div class="ornament" style="margin-top:22px;color:var(--gold-600)"><span></span></div>
<div class="eyebrow k-badge">Gründungspaket</div>
<div class="display k-head">Drei Abende.</div>
<div class="display k-price">für 79 € <s>statt 114 €</s></div>
<div class="k-small">Das sind 26,33 € pro Abend statt 38 €.</div>
<div class="k-points">3 Tischteilnahmen, 12 Monate gültig<br>Abzeichen „Gründungsmitglied“ im Profil<br>Zahlung erst bei der ersten Einladung</div>
<div class="k-btn">Platz sichern</div>
</div></div></div><div class="eyebrow k-site">tisch6.at · Link in Bio</div></div></div>`,
      extra,
    );
  }
  const extra = `
.shade { background: linear-gradient(180deg, rgb(6 9 19 / 0.7) 0%, rgb(6 9 19 / 0.15) 35%, rgb(6 9 19 / 0.55) 62%, rgb(6 9 19 / 0.95) 100%); }
.head { position: absolute; top: 84px; left: 88px; }
.text { position: absolute; left: 88px; right: 88px; bottom: 170px; }
.p-eyebrow { font-size: 26px; }
.p-title { font-size: 104px; margin-top: 26px; }
.foot { position: absolute; left: 88px; bottom: 82px; font-size: 24px; }`;
  return page(
    1080,
    1350,
    `<div class="frame"><div class="layer photo" style="background-image:url('${photo(post.bg)}')"></div><div class="layer shade"></div><div class="head">${brand(52, 44)}</div><div class="text"><div class="eyebrow p-eyebrow">${esc(post.eyebrow)}</div><div class="display p-title">${esc(post.title)}<br><span class="gold">${esc(post.gold)}</span></div></div><div class="eyebrow foot">tisch6.at</div></div>`,
    extra,
  );
}

// ---------------------------------------------------------------------------
// Anzeigen: Foto oben mit Überschrift, darunter „So funktioniert's“ – Feed (1080×1350) und Story (1080×1920)
// ---------------------------------------------------------------------------

const adFormats = { feed: [1080, 1350], story: [1080, 1920] };

function adHtml(ad, format) {
  const story = format === "story";
  const [w, h] = adFormats[format];
  // Story: oben und unten je rund 250 px frei lassen – dort liegen Profilzeile und Knopf der Anzeige.
  // Das Foto sitzt so, dass Teller und Serviette zwischen Überschrift und Ablauf frei zu sehen sind.
  const v = story
    ? { photoTop: 80, photo: 980, dark: 45, top: 250, mark: 62, brand: 54, eyebrow: 40, title: 100, how: 965, num: 66, step: 48, text: 31, gap: 28, bottom: 265 }
    : { photoTop: 0, photo: 760, dark: 40, top: 64, mark: 54, brand: 46, eyebrow: 56, title: 100, how: 710, num: 58, step: 42, text: 28, gap: 22, bottom: 64 };
  const extra = `
.ad-bg { background: radial-gradient(ellipse 80% 30% at 50% 100%, rgb(40 50 85 / 0.5), transparent 70%), var(--night-950); }
.ad-photo, .ad-shade { top: ${v.photoTop}px; height: ${v.photo}px; bottom: auto; }
.ad-photo { background-position: center bottom; }
.ad-shade { background: linear-gradient(180deg, ${story ? "var(--night-950)" : "rgb(6 9 19 / 0.9)"} 0%, rgb(6 9 19 / ${story ? 0.7 : 0.6}) ${v.dark}%, rgb(6 9 19 / 0.08) 62%, rgb(6 9 19 / 0.4) 80%, var(--night-950) 100%); }
.ad-head { position: absolute; top: ${v.top}px; left: 76px; right: 76px; }
.ad-eyebrow { font-size: ${story ? 30 : 26}px; margin-top: ${v.eyebrow}px; }
.ad-title { font-size: ${v.title}px; margin-top: 20px; }
.ad-how { position: absolute; left: 76px; right: 76px; top: ${v.how}px; }
.ad-label { display: flex; align-items: center; gap: 24px; font-size: ${story ? 28 : 24}px; }
.ad-label::after { content: ""; flex: 1; height: 2px; background: linear-gradient(90deg, rgb(214 183 122 / 0.6), transparent); }
.ad-steps { list-style: none; margin-top: ${v.gap + 8}px; display: flex; flex-direction: column; gap: ${v.gap}px; }
.ad-steps li { display: grid; grid-template-columns: ${v.num + 30}px 1fr; align-items: baseline; }
.ad-steps b { font-family: "Cormorant", serif; font-style: italic; font-weight: 500; font-size: ${v.num}px; line-height: 1; color: var(--gold-400); }
.ad-steps strong { display: block; font-family: "Cormorant", serif; font-weight: 600; font-size: ${v.step}px; line-height: 1.1; }
.ad-steps span { display: block; margin-top: 8px; font-size: ${v.text}px; line-height: 1.35; color: rgb(244 239 230 / 0.8); }
.ad-note { margin-top: ${v.gap + 4}px; padding-left: ${v.num + 30}px; font-size: ${story ? 28 : 25}px; color: var(--gold-200); }
.ad-foot { position: absolute; left: 76px; right: 76px; bottom: ${v.bottom}px; display: flex; align-items: center; justify-content: space-between; }
.ad-pill { white-space: nowrap; padding: ${story ? "30px 52px" : "26px 44px"}; font-size: ${story ? 28 : 25}px; }
.ad-site { font-size: ${story ? 28 : 24}px; }
`;
  const steps = ad.steps.map((s, i) => `<li><b>${["I", "II", "III"][i]}</b><div><strong>${esc(s.title)}</strong><span>${esc(s.text)}</span></div></li>`).join("");
  return page(
    w,
    h,
    `<div class="frame"><div class="layer ad-bg"></div><div class="layer photo ad-photo" style="background-image:url('${photo(ad.bg)}')"></div><div class="layer ad-shade"></div>
<div class="ad-head">${brand(v.mark, v.brand)}<div class="eyebrow ad-eyebrow">${esc(ad.eyebrow)}</div><div class="display ad-title">${esc(ad.title)}<br><span class="gold">${esc(ad.gold)}</span></div></div>
<div class="ad-how"><div class="eyebrow ad-label">So funktioniert's</div><ol class="ad-steps">${steps}</ol><p class="ad-note">${esc(ad.note)}</p></div>
<div class="ad-foot"><span class="pill ad-pill">Jetzt kostenlos bewerben</span><span class="eyebrow ad-site">tisch6.at</span></div></div>`,
    extra,
  );
}

// ---------------------------------------------------------------------------
// Ausgabe
// ---------------------------------------------------------------------------

async function open(browser, html, w, h, name) {
  mkdirSync(TMP, { recursive: true });
  const file = path.join(TMP, `${name}.html`);
  writeFileSync(file, html);
  const pg = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await pg.goto(pathToFileURL(file).href, { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  return pg;
}

async function renderReel(browser, reel) {
  const pg = await open(browser, reelHtml(reel), 1080, 1920, reel.id);
  const out = path.join(OUT, `${reel.id}.mp4`);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "-", "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-shortest", "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-profile:v", "high", "-r", String(FPS), "-movflags", "+faststart", "-c:a", "aac", "-b:a", "128k", out], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((resolve, reject) => ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`)))));
  const frames = Math.ceil(reel.duration * FPS);
  for (let f = 0; f < frames; f++) {
    await pg.evaluate((t) => window.renderAt(t), f / FPS);
    const buf = await pg.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  }
  ff.stdin.end();
  await done;
  // Titelbild für die Vorschau (erste Szene ist sofort sichtbar)
  await pg.evaluate(() => window.renderAt(1.2));
  await pg.screenshot({ path: path.join(OUT, `${reel.id}-cover.jpg`), type: "jpeg", quality: 90 });
  await pg.close();
  return [`${SITE}/${reel.id}.mp4`];
}

async function renderCarousel(browser, carousel) {
  const urls = [];
  for (let i = 0; i < carousel.slides.length; i++) {
    const name = `${carousel.id}-${i + 1}`;
    const pg = await open(browser, slideHtml(carousel, carousel.slides[i], i, carousel.slides.length), 1080, 1350, name);
    await pg.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 92 });
    await pg.close();
    urls.push(`${SITE}/${name}.jpg`);
  }
  return urls;
}

async function renderPost(browser, post) {
  const pg = await open(browser, postHtml(post), 1080, 1350, post.id);
  await pg.screenshot({ path: path.join(OUT, `${post.id}.jpg`), type: "jpeg", quality: 92 });
  await pg.close();
  return [`${SITE}/${post.id}.jpg`];
}

async function renderAd(browser, ad) {
  const urls = [];
  for (const [format, [w, h]] of Object.entries(adFormats)) {
    const name = `${ad.id}-${format}`;
    const pg = await open(browser, adHtml(ad, format), w, h, name);
    await pg.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 92 });
    await pg.close();
    urls.push(`${SITE}/${name}.jpg`);
  }
  return urls;
}


// ---------------------------------------------------------------------------
// Storys (1080×1920, Bild): tägliche Storys und „Neu im Feed“ zu jedem Beitrag
// ---------------------------------------------------------------------------

const storyCss = `
.shade { background: linear-gradient(180deg, rgb(6 9 19 / 0.85) 0%, rgb(6 9 19 / 0.45) 30%, rgb(6 9 19 / 0.6) 62%, rgb(6 9 19 / 0.95) 100%); }
.top { position: absolute; top: 290px; left: 0; right: 0; display: flex; justify-content: center; }
.mid { position: absolute; left: 80px; right: 80px; top: 430px; bottom: 470px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.bottom { position: absolute; left: 80px; right: 80px; bottom: 360px; display: flex; flex-direction: column; align-items: center; gap: 26px; text-align: center; }
.st-eyebrow { font-size: 34px; }
.st-line { font-size: 120px; }
.st-price { font-size: 96px; margin-top: 30px; color: var(--gold-300); }
.st-sub { margin-top: 46px; font-size: 46px; line-height: 1.4; color: rgb(244 239 230 / 0.86); max-width: 880px; text-wrap: balance; }
.st-q { font-size: 104px; margin-top: 40px; }
.st-list { list-style: none; margin-top: 50px; display: flex; flex-direction: column; gap: 46px; text-align: left; }
.st-list li { display: flex; align-items: baseline; gap: 34px; font-size: 54px; line-height: 1.25; }
.st-list b { font-family: "Cormorant", serif; font-style: italic; font-weight: 500; font-size: 84px; color: var(--gold-400); min-width: 90px; }
.st-pill { padding: 30px 56px; font-size: 32px; }
.st-note { font-size: 28px; color: rgb(244 239 230 / 0.7); }
.frame-img { border: 2px solid rgb(214 183 122 / 0.55); box-shadow: 0 40px 90px -30px rgb(0 0 0 / 0.85); display: block; }
`;

function storyHtml(st) {
  const background = st.bg
    ? `<div class="layer photo" style="background-image:url('${photo(st.bg)}');transform:scale(1.08)"></div><div class="layer shade"></div>`
    : `<div class="layer glow"></div>`;
  let mid = "";
  let bottom = `<span class="pill st-pill">Bewerbung · Link in Bio</span><span class="eyebrow st-note">tisch6.at</span>`;
  if (st.kind === "question") {
    mid = `<div class="eyebrow st-eyebrow">Frage des Tages</div><div class="ornament" style="margin-top:34px"><span></span></div><div class="display st-q">${esc(st.q)}</div>`;
    bottom = `<span class="st-sub" style="margin-top:0">Antworte uns per Nachricht – wir sind gespannt.</span><span class="eyebrow st-note">@tischsechs</span>`;
  } else {
    const lines = (st.lines ?? []).map((l) => `<div class="display st-line">${esc(l)}</div>`).join("");
    const gold = st.gold ? `<div class="display st-line"><span class="gold">${esc(st.gold)}</span></div>` : "";
    const price = st.price ? `<div class="display st-price">${esc(st.price)}</div>` : "";
    const list = st.list ? `<ol class="st-list">${st.list.map((t, i) => `<li><b>${["I", "II", "III", "IV"][i]}</b><span>${esc(t)}</span></li>`).join("")}</ol>` : "";
    const sub = st.sub ? `<p class="st-sub">${esc(st.sub)}</p>` : "";
    mid = `<div class="eyebrow st-eyebrow">${esc(st.eyebrow)}</div><div class="ornament" style="margin:34px 0 30px"><span></span></div>${lines}${gold}${price}${list}${sub}`;
  }
  return page(1080, 1920, `<div class="frame">${background}<div class="top">${brand(60, 52)}</div><div class="mid">${mid}</div><div class="bottom">${bottom}</div></div>`, storyCss);
}

/** „Neu im Feed“: das Titelbild des Beitrags im Rahmen, darunter der Hinweis aufs Profil */
function teaserHtml(item) {
  const isReel = item.type === "REEL";
  const file = isReel ? `${item.id}-cover.jpg` : item.type === "CAROUSEL" ? `${item.id}-1.jpg` : `${item.id}.jpg`;
  const img = pathToFileURL(path.join(OUT, file)).href;
  const size = isReel ? "width:540px;height:960px" : "width:780px;height:975px";
  const label = isReel ? "Neues Reel" : item.type === "CAROUSEL" ? "Neues Karussell" : "Neu im Feed";
  return page(
    1080,
    1920,
    `<div class="frame"><div class="layer glow"></div><div class="top">${brand(60, 52)}</div>
<div class="mid" style="top:400px;bottom:420px"><div class="eyebrow st-eyebrow" style="margin-bottom:40px">${label}</div><img class="frame-img" src="${img}" style="${size}"></div>
<div class="bottom" style="bottom:330px"><span class="st-sub" style="margin-top:0">Jetzt auf unserem Profil</span><span class="eyebrow st-note">@tischsechs</span></div></div>`,
    storyCss,
  );
}

async function renderStory(browser, id, html) {
  const pg = await open(browser, html, 1080, 1920, id);
  await pg.screenshot({ path: path.join(OUT, `${id}.jpg`), type: "jpeg", quality: 90 });
  await pg.close();
  return [`${SITE}/${id}.jpg`];
}

const feedItems = [
  ...reels.map((r) => ({ id: r.id, type: "REEL", ai: r.ai })),
  ...carousels.map((c) => ({ id: c.id, type: "CAROUSEL", ai: c.ai })),
  ...posts.map((p) => ({ id: p.id, type: "POST", ai: p.ai })),
];

const only = process.argv.slice(2);
const wanted = (id) => !only.length || only.includes(id);
mkdirSync(OUT, { recursive: true });
const chromium = await loadChromium();
const browser = await chromium.launch();
const done = [];
for (const r of reels) if (wanted(r.id)) done.push(`${r.id}: ${(await renderReel(browser, r)).length} Datei(en)`);
for (const c of carousels) if (wanted(c.id)) done.push(`${c.id}: ${(await renderCarousel(browser, c)).length} Datei(en)`);
for (const p of posts) if (wanted(p.id)) done.push(`${p.id}: ${(await renderPost(browser, p)).length} Datei(en)`);
for (const a of ads) if (wanted(a.id)) done.push(`${a.id}: ${(await renderAd(browser, a)).length} Datei(en)`);
for (const st of stories) if (wanted(st.id) || wanted("storys")) done.push(`${st.id}: ${(await renderStory(browser, st.id, storyHtml(st))).length} Datei(en)`);
for (const f of feedItems) if (wanted(`story-neu-${f.id}`) || wanted("storys")) done.push(`story-neu-${f.id}: ${(await renderStory(browser, `story-neu-${f.id}`, teaserHtml(f))).length} Datei(en)`);
await browser.close();

// Übersicht für das Einplanen: Dateiadressen auf tisch6.at und Bildunterschriften
const manifest = [
  ...reels.map((r) => ({ id: r.id, type: "REEL", ai: r.ai, media: [`${SITE}/${r.id}.mp4`], cover: `${SITE}/${r.id}-cover.jpg`, caption: r.caption })),
  ...carousels.map((c) => ({ id: c.id, type: "CAROUSEL", ai: c.ai, media: c.slides.map((_, i) => `${SITE}/${c.id}-${i + 1}.jpg`), caption: c.caption })),
  ...posts.map((p) => ({ id: p.id, type: "POST", ai: p.ai, media: [`${SITE}/${p.id}.jpg`], caption: p.caption })),
  // Anzeigen werden nicht automatisch eingeplant – Bild und Text kommen von Hand in den Werbeanzeigenmanager
  ...ads.flatMap((a) => Object.keys(adFormats).map((f) => ({ id: `${a.id}-${f}`, type: "ANZEIGE", ai: a.ai, media: [`${SITE}/${a.id}-${f}.jpg`], caption: a.caption }))),
  ...stories.map((st) => ({ id: st.id, type: "STORY", ai: Boolean(st.ai), media: [`${SITE}/${st.id}.jpg`] })),
  // Der Hinweis zeigt das Titelbild des Beitrags – also dieselbe KI-Kennzeichnung wie der Beitrag
  ...feedItems.map((f) => ({ id: `story-neu-${f.id}`, type: "STORY", ai: f.ai, media: [`${SITE}/story-neu-${f.id}.jpg`] })),
];
writeFileSync(path.join(HERE, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(done.join("\n"));
