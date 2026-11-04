/**
 * Chargeur d'images de next/image. Sur Cloudflare (OpenNext sans service d'images), `/_next/image`
 * renvoie la photo d'origine quelle que soit la largeur demandée : les photos du site pointent donc
 * vers les versions réduites générées à la construction (`scripts/images/variants.mjs`), les
 * autres (Supabase, SVG) sont servies telles quelles.
 */
import { VARIANT_WIDTHS } from "./image-widths.mjs";

const LOCAL = /^\/(products|brand)\/.+\.(webp|jpe?g|png)$/i;

export default function imageLoader({ src, width }: { src: string; width: number }): string {
  if (LOCAL.test(src)) {
    const w = VARIANT_WIDTHS.find((x) => x >= width);
    if (w) return `/img-w/${w}${src.replace(/\.(jpe?g|png)$/i, ".webp")}`;
  }
  // Photo d'origine (plus grande que la dernière version réduite) ou image externe.
  return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
}
