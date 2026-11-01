// Met la vue éclatée au format 4:5 de la galerie et ajoute la légende des 4 éléments.
import sharp from "sharp";
const [src, out] = process.argv.slice(2);
const labels = ["Panneau arrière", "Cadre", "Œuvre imprimée", "Ruban lumineux LED"];
const xs = [345, 600, 830, 1095];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1875">
  <text x="750" y="250" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-size="64" fill="#44372E">Composition</text>
  <text x="750" y="300" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="22" letter-spacing="6" fill="#A88A62">SILHOUETTE · TABLEAU LUMINEUX</text>
  ${labels.map((l, i) => `<circle cx="${xs[i]}" cy="1600" r="22" fill="#C39A6B"/><text x="${xs[i]}" y="1608" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="24" font-weight="600" fill="#fff">${i + 1}</text>
  <text x="${xs[i]}" y="1670" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="26" fill="#44372E">${l}</text>`).join("")}
</svg>`;
const padded = await sharp(src).extend({ top: 338, bottom: 337, extendWith: "copy" }).png().toBuffer();
const labelled = await sharp(padded).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
await sharp(labelled)
  .resize(1200, 1500)
  .webp({ quality: 86 })
  .toFile(out);
console.log("✔", out);
