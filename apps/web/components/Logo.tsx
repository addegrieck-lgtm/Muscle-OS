/* Logos officiels (brand/). Servis en SVG statiques : nets à toute taille, mis en cache, zéro JS. */
/* eslint-disable @next/next/no-img-element */

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function Emblem({ className = "size-8" }: { className?: string }) {
  return <img src={`${base}/brand/valoria-symbole.svg`} alt="" width={32} height={32} className={className} />;
}

/** Écusson + logotype argent (navbar, footer). Le texte alternatif porte le nom de la marque. */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const h = size === "lg" ? "h-5" : "h-4";
  return (
    <span className="flex items-center gap-2.5">
      <Emblem className={size === "lg" ? "size-10" : "size-8"} />
      <img src={`${base}/brand/valoria-wordmark-argent.svg`} alt="VÆLORIA" width={126} height={21} className={`${h} w-auto`} />
    </span>
  );
}

/** Verrouillage du hero : empilé sur mobile (logo complet), horizontal sur grand écran. */
export function HeroLockup() {
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <img
        src={`${base}/brand/valoria-symbole.svg`}
        alt=""
        width={160}
        height={160}
        fetchPriority="high"
        className="size-28 drop-shadow-[0_0_40px_rgb(210_31_47/0.25)] sm:size-36 lg:size-44"
      />
      <span aria-hidden className="hidden h-28 w-px bg-line-strong sm:block" />
      <img src={`${base}/brand/valoria-wordmark-argent.svg`} alt="" width={634} height={104} fetchPriority="high" className="h-10 w-auto sm:h-14 lg:h-20" />
    </div>
  );
}
