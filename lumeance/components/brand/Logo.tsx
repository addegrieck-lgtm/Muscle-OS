import { useId } from "react";
import { SYMBOL_PATHS, TAGLINE, WORDMARK } from "@/lib/brand/paths.generated";

type Tone = "gold" | "ivoire" | "noir" | "current";

function useGradient(tone: Tone) {
  const id = useId().replace(/:/g, "");
  const fill =
    tone === "gold"
      ? `url(#lg-${id})`
      : tone === "ivoire"
        ? "#F1ECE4"
        : tone === "noir"
          ? "#191817"
          : "currentColor";
  const defs =
    tone === "gold" ? (
      <defs>
        <linearGradient id={`lg-${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#E6DCCF" />
          <stop offset=".4" stopColor="#A88A62" />
          <stop offset=".75" stopColor="#C6B49A" />
          <stop offset="1" stopColor="#A88A62" />
        </linearGradient>
      </defs>
    ) : null;
  return { fill, defs };
}

/** Symbole LUMÉANCE (flamme, ruban, arc, étoile). Les parties portent des classes pour
 * permettre l'animation de tracé de l'intro. */
export function LogoSymbol({
  tone = "gold",
  className,
  showArc = true,
  title,
}: {
  tone?: Tone;
  className?: string;
  showArc?: boolean;
  title?: string;
}) {
  const { fill, defs } = useGradient(tone);
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {defs}
      {showArc && (
        <path
          className="lum-arc"
          d={SYMBOL_PATHS.arc}
          fill="none"
          stroke={fill}
          strokeWidth={1}
          strokeLinecap="round"
          pathLength={1}
        />
      )}
      <path className="lum-part" d={SYMBOL_PATHS.flame} fill={fill} />
      <path className="lum-part" d={SYMBOL_PATHS.ribbon} fill={fill} opacity={0.8} />
      <path className="lum-part" d={SYMBOL_PATHS.swoosh} fill={fill} />
      <path className="lum-star" d={SYMBOL_PATHS.star} fill={fill} />
    </svg>
  );
}

/** Lettrage vectoriel LUMÉANCE (tracés, aucune dépendance à la police). */
export function Wordmark({
  className,
  title = "LUMÉANCE",
}: {
  className?: string;
  title?: string;
}) {
  const h = WORDMARK.ascent + WORDMARK.descent;
  return (
    <svg
      viewBox={`0 ${-WORDMARK.ascent} ${WORDMARK.width} ${h}`}
      className={className}
      role="img"
      aria-label={title}
      fill="currentColor"
    >
      <path d={WORDMARK.d} />
    </svg>
  );
}

export function Tagline({ className }: { className?: string }) {
  const h = TAGLINE.ascent + TAGLINE.descent;
  return (
    <svg
      viewBox={`0 ${-TAGLINE.ascent} ${TAGLINE.width} ${h}`}
      className={className}
      role="img"
      aria-label="L’art de révéler la lumière"
      fill="currentColor"
    >
      <path d={TAGLINE.d} />
    </svg>
  );
}

/** Logo horizontal compact pour l'en-tête. */
export function LogoHorizontal({ className, tone = "gold" }: { className?: string; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <LogoSymbol tone={tone} className="h-9 w-9 shrink-0 md:h-10 md:w-10" />
      <Wordmark className="h-[0.95rem] w-auto md:h-[1.05rem]" />
    </span>
  );
}
