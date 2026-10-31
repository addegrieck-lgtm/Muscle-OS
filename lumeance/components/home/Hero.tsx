import { HeroVisual } from "@/components/motion/HeroVisual";
import { ButtonLink } from "@/components/ui/Button";
import type { HomeContent } from "@/types/catalog";

export function Hero({ content }: { content: HomeContent }) {
  return (
    <section
      className="grain relative isolate flex min-h-[100svh] items-end overflow-hidden bg-noir text-ivoire md:items-center"
      aria-labelledby="hero-title"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_68%_40%,#3b2f26_0%,#1f1b18_55%,#141312_100%)]" />
      <div className="glow-breathe absolute right-[8%] top-[18%] -z-10 h-[50vmax] w-[50vmax] rounded-full bg-[radial-gradient(circle,rgba(255,214,150,0.16),transparent_62%)]" />

      {/* Lustre : plein cadre atténué sur mobile, moitié droite sur grand écran. */}
      <div
        className="absolute inset-0 -z-10 opacity-55 md:left-[38%] md:opacity-100"
        data-parallax="0.12"
      >
        <HeroVisual />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-noir via-noir/30 to-transparent md:bg-gradient-to-r md:from-noir/85 md:via-noir/30 md:to-transparent" />

      <div className="container-luxe pb-24 pt-40 md:pb-0 md:pt-24">
        <div className="max-w-2xl">
          <p data-reveal="fade" className="t-eyebrow text-champagne">
            Maison française de luminaires
          </p>
          <h1
            id="hero-title"
            data-reveal
            data-reveal-delay="0.1"
            className="t-display mt-6 -ml-[0.06em]"
          >
            {content.heroTitle}
          </h1>
          <p
            data-reveal
            data-reveal-delay="0.25"
            className="mt-6 font-serif text-2xl italic text-champagne-clair md:text-[2rem]"
          >
            {content.heroSignature}
          </p>
          <p data-reveal data-reveal-delay="0.4" className="mt-6 max-w-md text-ivoire/75">
            {content.heroText}
          </p>
          <div data-reveal data-reveal-delay="0.55" className="mt-10">
            <ButtonLink href="/collections" variant="outline-light">
              Découvrir la collection
            </ButtonLink>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex"
        aria-hidden
      >
        <span className="t-eyebrow text-[0.6rem] text-ivoire/50">Défiler</span>
        <span className="relative h-14 w-px overflow-hidden bg-ivoire/15">
          <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.4s_var(--ease-silk)_infinite] bg-champagne" />
        </span>
      </div>
    </section>
  );
}
