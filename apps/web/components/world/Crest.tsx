/**
 * Blason d'empire : la silhouette de l'écusson officiel VÆLORIA (même tracé que brand/build.py),
 * liseré argent, cœur anthracite, marque géométrique dans la couleur de l'empire.
 * Aucun nouveau style graphique : seule la marque et sa couleur changent d'un empire à l'autre.
 */
import { cn } from "@vaeloria/ui";

const SHIELD = "M256 40 L300 100 L360 72 L432 104 L432 264 C432 360 360 420 256 472 C152 420 80 360 80 264 L80 104 L152 72 L212 100 Z";

export const CREST_LABELS: Record<string, string> = {
  chevron: "Chevron", losange: "Losange", couronne: "Couronne", etoile: "Étoile", lame: "Lame", tour: "Tour", flamme: "Flamme", croix: "Croix",
};

const MARKS: Record<string, string> = {
  chevron: "M168 300 L256 200 L344 300 L344 350 L256 250 L168 350 Z",
  losange: "M256 160 L336 270 L256 380 L176 270 Z",
  couronne: "M170 330 L170 210 L218 260 L256 190 L294 260 L342 210 L342 330 Z",
  etoile: "M256 160 L282 238 L364 240 L298 288 L322 368 L256 320 L190 368 L214 288 L148 240 L230 238 Z",
  lame: "M240 150 L272 150 L268 320 L300 320 L300 344 L268 344 L268 392 L244 392 L244 344 L212 344 L212 320 L244 320 Z",
  tour: "M188 380 L188 220 L212 220 L212 190 L236 190 L236 220 L276 220 L276 190 L300 190 L300 220 L324 220 L324 380 Z M240 380 L240 320 L272 320 L272 380 Z",
  flamme: "M256 150 C300 210 340 250 330 310 C322 360 290 388 256 388 C222 388 190 360 182 310 C176 270 200 240 222 220 C226 260 240 280 256 286 C246 240 240 200 256 150 Z",
  croix: "M232 170 L280 170 L280 246 L356 246 L356 294 L280 294 L280 370 L232 370 L232 294 L156 294 L156 246 L232 246 Z",
};

export function Crest({ crest, color, className, title }: { crest: string; color: string; className?: string; title?: string }) {
  const id = `c-${crest}-${color.replace("#", "")}`;
  return (
    <svg viewBox="40 20 432 470" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#d9dce2" />
          <stop offset="0.55" stopColor="#a9aeb8" />
          <stop offset="1" stopColor="#e6e8ec" />
        </linearGradient>
        <linearGradient id={`${id}-core`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2c33" />
          <stop offset="1" stopColor="#07070a" />
        </linearGradient>
      </defs>
      <path d={SHIELD} fill={`url(#${id}-rim)`} />
      <path d={SHIELD} transform="translate(256 262) scale(0.875) translate(-256 -262)" fill={`url(#${id}-core)`} />
      <path d={MARKS[crest] ?? MARKS.losange} fill={color} />
    </svg>
  );
}
