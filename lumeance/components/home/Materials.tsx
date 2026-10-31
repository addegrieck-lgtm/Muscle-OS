import { Eyebrow } from "@/components/ui/Button";

const MATERIALS = [
  {
    name: "Le verre",
    text: "Soufflé, ambré ou opalin, il retient la lumière et l’adoucit. Chaque sphère devient une petite source de chaleur.",
    swatch:
      "radial-gradient(circle at 35% 30%, rgba(255,250,240,0.95) 0 8%, rgba(244,221,181,0.55) 22%, rgba(168,138,98,0.25) 55%, transparent 56%), radial-gradient(circle at 70% 70%, rgba(255,246,230,0.8) 0 6%, rgba(233,196,140,0.35) 18%, transparent 32%), linear-gradient(160deg, #2a231e, #191817)",
  },
  {
    name: "Le cristal",
    text: "Ses facettes fragmentent la lumière en reflets. Il dessine au plafond et sur les murs un second décor.",
    swatch:
      "conic-gradient(from 30deg at 50% 50%, #f7efe2, #c6b49a, #fff8ec, #a88a62, #f1ece4, #d9c4a1, #f7efe2)",
  },
  {
    name: "Le laiton",
    text: "Brossé, poli ou patiné, il apporte la chaleur d’un métal noble et vieillit avec élégance.",
    swatch:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 3px), linear-gradient(135deg, #e9d6b4, #a88a62 45%, #d9c4a1 70%, #8a6e4b)",
  },
  {
    name: "Les finitions",
    text: "Champagne, doré satiné, bronze ou noir mat : la finition accorde la pièce à son intérieur.",
    swatch:
      "linear-gradient(90deg, #e6dccf 0 20%, #c6b49a 20% 40%, #a88a62 40% 60%, #44372e 60% 80%, #191817 80%)",
  },
];

export function Materials() {
  return (
    <section className="bg-ivoire py-28 md:py-40" aria-labelledby="matieres-title">
      <div className="container-luxe">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Eyebrow number="05">Matières et détails</Eyebrow>
            <h2 id="matieres-title" data-reveal className="t-h2 mt-6">
              La beauté tient au détail.
            </h2>
          </div>
          <p data-reveal className="t-lead text-brun/80 md:col-span-6 md:col-start-7">
            Verre, cristal, métal : nous choisissons des pièces pour la qualité de leur lumière
            autant que pour leur silhouette. Les matériaux exacts de chaque création sont indiqués
            sur sa fiche.
          </p>
        </div>
        <div className="mt-20 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {MATERIALS.map((m, i) => (
            <article key={m.name} data-reveal data-reveal-delay={String(i * 0.1)} className="group">
              <div className="aspect-[4/3] overflow-hidden sm:aspect-[3/4]">
                <div
                  className="h-full w-full transition-transform duration-[1800ms] ease-[var(--ease-luxe)] group-hover:scale-110"
                  style={{ background: m.swatch }}
                />
              </div>
              <h3 className="mt-6 font-serif text-2xl">{m.name}</h3>
              <p className="t-small mt-3 text-brun/70">{m.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
