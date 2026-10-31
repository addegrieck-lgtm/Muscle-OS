// Génère l'identité vectorielle LUMÉANCE : tracés du lettrage (aucune dépendance à une police
// installée), fichiers SVG de /public/brand et module TypeScript utilisé par les composants.
//
// Usage : node scripts/build-brand.mjs <dossier contenant les .woff Cormorant Garamond>
// (les .woff s'obtiennent avec `npm pack @fontsource/cormorant-garamond`, dossier files/).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fontDir = process.argv[2];
if (!fontDir) throw new Error("Dossier des polices .woff manquant");

const load = (w) =>
  opentype.parse(
    readFileSync(join(fontDir, `cormorant-garamond-latin-${w}-normal.woff`)).buffer,
  );
const serif = load(400);
const serifMedium = load(500);

const C = {
  ivoire: "#F1ECE4",
  creme: "#E6DCCF",
  sable: "#C6B49A",
  champagne: "#A88A62",
  brun: "#44372E",
  noir: "#191817",
};

// ── Symbole : flamme, ruban, arc et étoile (viewBox 0 0 200 200) ─────────────
const SYMBOL = {
  arc: "M134 32A72 72 0 1 0 171 118",
  flame: "M126 26C98 50 82 84 89 113C93 130 103 141 114 145C101 130 96 102 104 77C109 60 117 42 126 26Z",
  ribbon: "M124 48C110 70 107 97 115 118C119 127 124 130 128 129C117 110 114 80 124 48Z",
  swoosh: "M52 166C74 146 102 138 128 141C148 143 163 136 171 118C166 142 148 156 124 154C98 151 74 152 52 166Z",
  star: "M153 52Q154.2 61.8 164 63Q154.2 64.2 153 74Q151.8 64.2 142 63Q151.8 61.8 153 52Z",
};

/** Sérialisation maison (toPathData d'opentype 2.0 produit des NaN avec arrondi). */
function toD(commands) {
  const n = (v) => String(Math.round(v * 100) / 100);
  return commands
    .map((c) => {
      if (c.type === "M" || c.type === "L") return `${c.type}${n(c.x)} ${n(c.y)}`;
      if (c.type === "Q") return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      if (c.type === "C") return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      return "Z";
    })
    .join("");
}

/** Texte -> tracé SVG, avec interlettrage en fraction de la taille. */
function textPath(font, text, size, tracking) {
  let x = 0;
  const parts = [];
  const chars = [...text];
  chars.forEach((ch, i) => {
    const g = font.charToGlyph(ch);
    parts.push(toD(g.getPath(x, 0, size).commands));
    x += g.advanceWidth * (size / font.unitsPerEm);
    if (i < chars.length - 1) x += tracking * size;
  });
  const box = font.getPath(text, 0, 0, size).getBoundingBox();
  return { d: parts.join(""), width: x, ascent: -box.y1, descent: box.y2 };
}

const word = textPath(serif, "LUMÉANCE", 100, 0.34);
const tag = textPath(serifMedium, "L’ART DE RÉVÉLER LA LUMIÈRE", 100, 0.32);

const r = (n) => Math.round(n * 100) / 100;

// ── Module TypeScript ─────────────────────────────────────────────────────
mkdirSync(join(root, "lib/brand"), { recursive: true });
writeFileSync(
  join(root, "lib/brand/paths.generated.ts"),
  `// Fichier généré par scripts/build-brand.mjs — ne pas modifier à la main.
export const SYMBOL_PATHS = ${JSON.stringify(SYMBOL, null, 2)} as const;

/** Lettrage LUMÉANCE, corps 100, ligne de base en y = 0. */
export const WORDMARK = { d: ${JSON.stringify(word.d)}, width: ${r(word.width)}, ascent: ${r(word.ascent)}, descent: ${r(word.descent)} } as const;

/** Signature « L’art de révéler la lumière », capitales, corps 100. */
export const TAGLINE = { d: ${JSON.stringify(tag.d)}, width: ${r(tag.width)}, ascent: ${r(tag.ascent)}, descent: ${r(tag.descent)} } as const;
`,
);

// ── SVG ───────────────────────────────────────────────────────────────────
const grad = (id) =>
  `<linearGradient id="${id}" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${C.creme}"/><stop offset=".4" stop-color="${C.champagne}"/><stop offset=".75" stop-color="${C.sable}"/><stop offset="1" stop-color="${C.champagne}"/></linearGradient>`;

function symbolGroup({ fill, arcStroke = fill, arcWidth = 1, starFill = fill, simplified = false }) {
  return [
    simplified ? "" : `<path d="${SYMBOL.arc}" fill="none" stroke="${arcStroke}" stroke-width="${arcWidth}" stroke-linecap="round"/>`,
    `<path d="${SYMBOL.flame}" fill="${fill}"/>`,
    `<path d="${SYMBOL.ribbon}" fill="${fill}" opacity=".8"/>`,
    `<path d="${SYMBOL.swoosh}" fill="${fill}"/>`,
    `<path d="${SYMBOL.star}" fill="${starFill}"/>`,
  ].join("");
}

const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(w)} ${r(h)}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;

/** Logo vertical : symbole, lettrage, signature, filet. */
function vertical({ text, gold, bg, rule = true }) {
  const W = 1200;
  const symSize = 360;
  const wordScale = 1.25; // lettrage à 125 px
  const tagScale = 0.36;
  const wordW = word.width * wordScale;
  const tagW = tag.width * tagScale;
  const yWord = symSize + 40 + word.ascent * wordScale;
  const yTag = yWord + 95;
  const H = yTag + (rule ? 95 : 40);
  const body = [
    bg ? `<rect width="${W}" height="${r(H + 80)}" fill="${bg}"/>` : "",
    `<defs>${grad("lg")}</defs>`,
    `<g transform="translate(${(W - symSize) / 2} 0) scale(${symSize / 200})">${symbolGroup({ fill: gold, starFill: gold })}</g>`,
    `<path transform="translate(${r((W - wordW) / 2)} ${r(yWord)}) scale(${wordScale})" d="${word.d}" fill="${text}"/>`,
    `<path transform="translate(${r((W - tagW) / 2)} ${r(yTag)}) scale(${tagScale})" d="${tag.d}" fill="${gold === "url(#lg)" ? C.champagne : gold}"/>`,
    rule ? `<rect x="${W / 2 - 90}" y="${r(yTag + 45)}" width="180" height="1.5" fill="${gold === "url(#lg)" ? C.sable : gold}" opacity=".7"/>` : "",
  ].join("");
  return { body, W, H: bg ? H + 80 : H };
}

function horizontal({ text, gold }) {
  const symSize = 200;
  const wordScale = 0.9;
  const tagScale = 0.255;
  const x0 = symSize + 36;
  const wordW = word.width * wordScale;
  const tagW = tag.width * tagScale;
  const yWord = 100 + 4;
  const yTag = yWord + 42;
  const W = x0 + Math.max(wordW, tagW) + 8;
  const body = [
    `<defs>${grad("lg")}</defs>`,
    symbolGroup({ fill: gold, starFill: gold }),
    `<path transform="translate(${x0} ${yWord}) scale(${wordScale})" d="${word.d}" fill="${text}"/>`,
    `<path transform="translate(${x0 + 2} ${yTag}) scale(${tagScale})" d="${tag.d}" fill="${gold === "url(#lg)" ? C.champagne : gold}"/>`,
  ].join("");
  return { body, W, H: 200 };
}

const out = join(root, "public/brand");
mkdirSync(out, { recursive: true });
const write = (name, content) => writeFileSync(join(out, name), content);

const v1 = vertical({ text: C.brun, gold: "url(#lg)", bg: C.ivoire });
write("logo-principal-ivoire.svg", svg(v1.W, v1.H, v1.body.replace(`<rect width`, `<rect y="-40" width`), "LUMÉANCE — L’art de révéler la lumière"));
const v2 = vertical({ text: C.ivoire, gold: "url(#lg)", bg: C.noir });
write("logo-principal-noir.svg", svg(v2.W, v2.H, v2.body.replace(`<rect width`, `<rect y="-40" width`), "LUMÉANCE — L’art de révéler la lumière"));
const v3 = vertical({ text: C.brun, gold: "url(#lg)" });
write("logo-vertical.svg", svg(v3.W, v3.H, v3.body, "LUMÉANCE"));
const v4 = vertical({ text: C.ivoire, gold: "url(#lg)" });
write("logo-vertical-clair.svg", svg(v4.W, v4.H, v4.body, "LUMÉANCE"));
const h1 = horizontal({ text: C.brun, gold: "url(#lg)" });
write("logo-horizontal.svg", svg(h1.W, h1.H, h1.body, "LUMÉANCE"));
const h2 = horizontal({ text: C.ivoire, gold: "url(#lg)" });
write("logo-horizontal-clair.svg", svg(h2.W, h2.H, h2.body, "LUMÉANCE"));
const m1 = vertical({ text: C.noir, gold: C.noir });
write("logo-monochrome-noir.svg", svg(m1.W, m1.H, m1.body, "LUMÉANCE"));
const m2 = vertical({ text: "#FFFFFF", gold: "#FFFFFF" });
write("logo-monochrome-blanc.svg", svg(m2.W, m2.H, m2.body, "LUMÉANCE"));
write("symbole.svg", svg(200, 200, `<defs>${grad("lg")}</defs>${symbolGroup({ fill: "url(#lg)" })}`, "Symbole LUMÉANCE"));
write("symbole-monochrome.svg", svg(200, 200, symbolGroup({ fill: C.noir }), "Symbole LUMÉANCE"));

// Favicon : sans arc fin (illisible en 16 px), symbole recentré sur fond noir arrondi.
const favicon = svg(
  200,
  200,
  `<defs>${grad("lg")}</defs><rect width="200" height="200" rx="44" fill="${C.noir}"/><g transform="translate(-10 -6) scale(1.08)">${symbolGroup({ fill: "url(#lg)", simplified: true })}</g>`,
  "LUMÉANCE",
);
write("favicon.svg", favicon);
writeFileSync(join(root, "app/icon.svg"), favicon);

// Icône réseaux sociaux (carré 1080, zone de sécurité circulaire respectée).
write(
  "icone-reseaux.svg",
  svg(1080, 1080, `<defs>${grad("lg")}<radialGradient id="halo" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#2a2420"/><stop offset="1" stop-color="${C.noir}"/></radialGradient></defs><rect width="1080" height="1080" fill="url(#halo)"/><g transform="translate(240 230) scale(3)">${symbolGroup({ fill: "url(#lg)", arcWidth: 0.8 })}</g>`, "LUMÉANCE"),
);

console.log("Identité générée :", out);
