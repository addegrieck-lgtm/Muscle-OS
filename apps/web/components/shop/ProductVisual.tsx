/**
 * Visuel par défaut d'un produit sans image : tuile anthracite + pictogramme de catégorie,
 * dans la charte (argent, liseré rubis). Remplacé automatiquement dès qu'une image est fournie dans l'admin.
 */
/* eslint-disable @next/next/no-img-element */
import { cn } from "@vaeloria/ui";

const GLYPHS: Record<string, React.ReactNode> = {
  // Grades : écusson
  grades: <path d="M32 6 50 12v17c0 13-8 22-18 27C22 51 14 42 14 29V12L32 6Z M24 20l8 22 8-22" />,
  // Spawners : cage
  spawners: <path d="M14 14h36v36H14Z M14 26h36 M14 38h36 M26 14v36 M38 14v36" />,
  // Items : gemme
  items: <path d="M20 14h24l10 12-22 26L10 26Z M10 26h44 M26 14l6 38 6-38" />,
  // Kits : épées croisées
  kits: <path d="M14 14l26 26 M50 14 24 40 M36 44l8-8 M28 44l-8-8 M40 40l8 8 M24 40l-8 8" />,
  // Packs : coffre
  packs: <path d="M12 26h40v24H12Z M12 26l4-10h32l4 10 M28 32h8v8h-8Z" />,
  // Cosmétiques : étincelle
  cosmetiques: <path d="M32 10v16 M32 38v16 M10 32h16 M38 32h16 M24 24l-6-6 M40 24l6-6 M24 40l-6 6 M40 40l6 6" />,
};

export function ProductVisual({ category, imageUrl, name, accent, className }: { category: string; imageUrl: string | null; name: string; accent?: string | null; className?: string }) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name} loading="lazy" className={cn("aspect-[4/3] w-full rounded-lg object-cover", className)} />;
  }
  return (
    <div
      aria-hidden
      className={cn("relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg border border-line bg-[radial-gradient(ellipse_at_50%_35%,#22161a_0%,#111216_55%,#0b0b0e_100%)]", className)}
    >
      <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-ruby/60 to-transparent" />
      <svg viewBox="0 0 64 64" className="size-16 drop-shadow-[0_0_18px_rgb(210_31_47/0.25)]" fill="none" stroke={accent ?? "url(#vae-silver)"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="vae-silver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#c3c7cf" />
            <stop offset="1" stopColor="#8b909b" />
          </linearGradient>
        </defs>
        {GLYPHS[category] ?? GLYPHS.packs}
      </svg>
    </div>
  );
}
