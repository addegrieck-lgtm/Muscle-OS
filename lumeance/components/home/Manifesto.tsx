import { LogoSymbol } from "@/components/brand/Logo";
import { Eyebrow } from "@/components/ui/Button";
import type { HomeContent } from "@/types/catalog";

const PRINCIPLES = [
  {
    title: "La lumière comme matière",
    text: "Nous regardons un luminaire comme un volume de lumière, avant d’y voir un objet.",
  },
  {
    title: "Le geste sculptural",
    text: "Des silhouettes qui tiennent l’espace, allumées comme éteintes.",
  },
  {
    title: "L’exigence du détail",
    text: "Matières, finitions, câbles, fixations : chaque pièce est examinée avant d’entrer au catalogue.",
  },
];

export function Manifesto({ content }: { content: HomeContent }) {
  return (
    <section
      className="relative overflow-hidden bg-ivoire py-28 md:py-44"
      aria-labelledby="manifeste-title"
    >
      <LogoSymbol className="pointer-events-none absolute -right-24 top-10 h-[34rem] w-[34rem] opacity-[0.07] md:-right-10" />
      <div className="container-luxe grid gap-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Eyebrow number="01">Manifeste</Eyebrow>
        </div>
        <div className="md:col-span-8">
          <h2 id="manifeste-title" data-reveal className="t-h1 max-w-4xl text-brun">
            {content.manifestoTitle}
          </h2>
          <p data-reveal data-reveal-delay="0.15" className="t-lead mt-10 max-w-3xl text-brun/85">
            {content.manifestoText}
          </p>
          <div className="mt-20 grid gap-10 border-t border-brun/10 pt-12 sm:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <div key={p.title} data-reveal data-reveal-delay={String(i * 0.12)}>
                <span className="font-serif text-sm italic text-champagne">
                  {["I", "II", "III"][i]}
                </span>
                <h3 className="mt-3 font-serif text-2xl">{p.title}</h3>
                <p className="t-small mt-3 text-brun/70">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
