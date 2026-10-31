import { LuminaireArt } from "@/components/art/LuminaireArt";

export function Immersive({ quote }: { quote: string }) {
  return (
    <section
      className="grain relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-noir text-ivoire"
      aria-label="La lumière devient architecture"
    >
      <div className="absolute inset-[-12%_0] -z-10" data-parallax="0.25">
        <LuminaireArt
          form="halo"
          seed="immersive"
          className="h-full w-full opacity-90"
          label="Illustration d’un lustre en anneau dans un grand volume"
        />
      </div>
      {/* Lignes d'architecture : escalier et hauteur sous plafond suggérés. */}
      <svg
        className="absolute inset-0 -z-10 h-full w-full opacity-[0.07]"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        aria-hidden
      >
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1={8 + i * 7}
            y1={100}
            x2={8 + i * 7}
            y2={100 - (i + 1) * 6}
            stroke="#F1ECE4"
            strokeWidth="0.08"
          />
        ))}
        <path
          d={`M0 100 ${Array.from({ length: 12 }, (_, i) => `L${8 + i * 7} ${100 - i * 6} L${8 + i * 7} ${100 - (i + 1) * 6}`).join(" ")}`}
          fill="none"
          stroke="#F1ECE4"
          strokeWidth="0.12"
        />
      </svg>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(25,24,23,0.85)_80%)]" />
      <div className="container-luxe text-center">
        <p data-reveal="fade" className="t-eyebrow text-champagne">
          04 — Architecture
        </p>
        <blockquote data-reveal data-reveal-delay="0.15" className="t-quote mx-auto mt-8 max-w-5xl">
          « {quote} »
        </blockquote>
        <div data-reveal data-reveal-delay="0.3" className="rule-champagne mx-auto mt-12 w-40" />
      </div>
    </section>
  );
}
