import { LogoSymbol } from "@/components/brand/Logo";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import { ButtonLink, Eyebrow } from "@/components/ui/Button";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "La Maison",
  description:
    "LUMÉANCE, maison française de luminaires design : notre regard sur la lumière, nos exigences et notre manière de sélectionner chaque pièce.",
  path: "/maison",
});

const COMMITMENTS = [
  {
    title: "Une sélection resserrée",
    text: "Une vingtaine à une quarantaine de pièces, pas davantage. Chacune doit mériter sa place par sa silhouette, sa lumière et sa fabrication.",
  },
  {
    title: "Des informations vérifiées",
    text: "Dimensions, matériaux, caractéristiques électriques et délais : nous ne publions que ce que nous avons vérifié auprès du fabricant. Ce qui n’est pas confirmé n’est pas affiché.",
  },
  {
    title: "La conformité avant tout",
    text: "Un luminaire est un appareil électrique. Avant d’entrer au catalogue, chaque pièce doit disposer des documents de conformité exigés pour la vente en France et dans l’Union européenne.",
  },
  {
    title: "Un accompagnement personnel",
    text: "Choisir un lustre pour une cage d’escalier ou un grand salon demande souvent un échange. Nous répondons à chaque question personnellement.",
  },
];

export default function MaisonPage() {
  return (
    <>
      <section className="grain relative isolate flex min-h-[85svh] items-end overflow-hidden bg-noir pb-20 text-ivoire md:items-center md:pb-0">
        <div className="absolute inset-0 -z-10 opacity-70 md:left-1/3" data-parallax="0.1">
          <LuminaireArt
            form="organic"
            seed="maison"
            framed={false}
            className="h-full w-full"
            label="Illustration d’une suspension organique dorée"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-noir via-noir/60 to-transparent" />
        <div className="container-luxe pt-32">
          <p data-reveal="fade" className="t-eyebrow text-champagne">
            La Maison
          </p>
          <h1 data-reveal className="t-h1 mt-6 max-w-3xl">
            Révéler la lumière, plutôt que la produire.
          </h1>
          <p data-reveal data-reveal-delay="0.2" className="t-lead mt-8 max-w-2xl text-ivoire/75">
            LUMÉANCE est née d’une conviction : un luminaire réussi ne se contente pas d’éclairer.
            Il donne à un intérieur son atmosphère, révèle ses matières et devient, allumé comme
            éteint, une pièce à part entière.
          </p>
        </div>
      </section>

      <section className="bg-ivoire py-28 md:py-40">
        <div className="container-luxe grid gap-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <Eyebrow number="01">Notre regard</Eyebrow>
          </div>
          <div className="space-y-6 text-brun/85 md:col-span-7">
            <p className="t-lead">
              Nous regardons la lumière comme une matière architecturale. Elle sculpte les volumes,
              souligne une hauteur sous plafond, accompagne une cage d’escalier, réchauffe la pierre
              et le bois.
            </p>
            <p>
              Nos pièces s’inspirent du design français et italien : des formes sculpturales, des
              matières nobles — verre, cristal, laiton, métal doré — et une lumière toujours chaude.
              Nous privilégions les silhouettes capables de tenir l’espace, sans jamais l’encombrer.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-creme py-28 md:py-40">
        <div className="container-luxe">
          <Eyebrow number="02">Nos engagements</Eyebrow>
          <div className="mt-14 grid gap-x-10 gap-y-14 md:grid-cols-2">
            {COMMITMENTS.map((c, i) => (
              <div
                key={c.title}
                data-reveal
                data-reveal-delay={String((i % 2) * 0.12)}
                className="border-t border-brun/15 pt-8"
              >
                <h2 className="t-h3">{c.title}</h2>
                <p className="mt-4 text-brun/75">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ouverture" className="scroll-mt-24 bg-ivoire py-28 md:py-40">
        <div className="container-luxe flex flex-col items-center text-center">
          <LogoSymbol className="h-16 w-16" />
          <h2 className="t-h2 mt-8 max-w-3xl">Une maison en préparation</h2>
          <div className="mt-8 max-w-2xl space-y-4 text-brun/80">
            <p>
              Le showroom que vous parcourez est un aperçu. Les pièces présentées aujourd’hui sont
              fictives et illustrées : elles servent à montrer l’esprit de la maison, pas à décrire
              des produits disponibles.
            </p>
            <p>
              La boutique ouvrira lorsque la sélection définitive, les fiches techniques vérifiées,
              les documents de conformité, les conditions de vente et le paiement sécurisé seront
              prêts. Aucune commande ni aucun paiement ne peuvent être passés d’ici là.
            </p>
          </div>
          <div className="mt-12">
            <ButtonLink href="/contact" variant="outline">
              Nous écrire
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
