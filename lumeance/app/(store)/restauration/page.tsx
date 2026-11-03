import { LuminaireArt } from "@/components/art/LuminaireArt";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ButtonLink, Eyebrow } from "@/components/ui/Button";
import {
  PRO_DISCOUNT_MAX_PERCENT,
  PRO_DISCOUNT_MIN_LABEL,
  PRO_TIERS,
  isOnPromotion,
} from "@/lib/catalog/pro";
import { formatPrice } from "@/lib/money";
import { PRO_CONTACT_HREF, PRO_SPACES, proUse } from "@/lib/content/restauration";
import { getProducts } from "@/lib/services/catalog";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Luminaires pour restaurants, bars et hôtels",
  description:
    "Luminaires design pour restaurants, bars et hôtels : suspensions au-dessus des tables, lustres d’accueil, appliques et terrasse. Sélection et devis sur mesure.",
  path: "/restauration",
});

const SERVICE = [
  {
    title: "Une sélection pour votre salle",
    text: "Envoyez-nous le plan, quelques photos et l’ambiance recherchée : nous vous proposons les pièces, les formats et le nombre de points lumineux adaptés.",
  },
  {
    title: `Jusqu’à −${PRO_DISCOUNT_MAX_PERCENT} % pour les professionnels`,
    text: `Restaurants, bars et hôtels bénéficient d’une remise dès ${PRO_DISCOUNT_MIN_LABEL} d’achat, d’autant plus forte que le projet est important : automatique avec un compte entreprise, ou sur devis. Nous vérifions aussi auprès du fabricant les quantités et les délais avant de nous engager.`,
  },
  {
    title: "Une lumière cohérente",
    text: "Même finition, même couleur de lumière d’une pièce à l’autre : chaque version et chaque option sont choisies pour l’ensemble de l’établissement.",
  },
];

export default async function RestaurationPage() {
  const products = (await getProducts()).filter((p) => proUse(p.slug));
  const promoNames = products.filter(isOnPromotion).map((p) => p.name);
  return (
    <>
      <section className="grain relative isolate flex min-h-[80svh] items-end overflow-hidden bg-noir pb-20 text-ivoire md:items-center md:pb-0">
        <div className="absolute inset-0 -z-10 opacity-70 md:left-1/3" data-parallax="0.1">
          <LuminaireArt
            form="globes"
            seed="restauration"
            framed={false}
            className="h-full w-full"
            label="Illustration de suspensions en série au-dessus de tables"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-noir via-noir/60 to-transparent" />
        <div className="container-luxe pt-32">
          <p data-reveal="fade" className="t-eyebrow text-champagne">
            Restaurants, bars et hôtels
          </p>
          <h1 data-reveal className="t-h1 mt-6 max-w-3xl">
            La lumière fait la moitié de l’ambiance.
          </h1>
          <p data-reveal="fade" className="t-eyebrow mt-6 text-champagne">
            Jusqu’à −{PRO_DISCOUNT_MAX_PERCENT} % pour les professionnels
          </p>
          <p data-reveal data-reveal-delay="0.2" className="t-lead mt-8 max-w-2xl text-ivoire/75">
            On revient dans une salle autant pour sa lumière que pour sa carte. Nos suspensions,
            lustres et appliques composent un décor que l’on remarque, au-dessus des tables, du
            comptoir, à l’accueil comme en terrasse.
          </p>
          <div data-reveal data-reveal-delay="0.3" className="mt-12">
            <ButtonLink href={PRO_CONTACT_HREF} variant="outline-light">
              Parler de votre projet
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="bg-ivoire py-28 md:py-40">
        <div className="container-luxe">
          <Eyebrow number="01">Par espace</Eyebrow>
          <h2 data-reveal className="t-h2 mt-6 max-w-3xl">
            Une pièce pour chaque endroit de la salle.
          </h2>
          <div className="mt-20 space-y-24 md:space-y-32">
            {PRO_SPACES.map((space) => {
              const items = products.filter((p) => proUse(p.slug)?.space === space.id);
              if (items.length === 0) return null;
              return (
                <div key={space.id} className="grid gap-10 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <h3 data-reveal className="t-h3">
                      {space.title}
                    </h3>
                    <p data-reveal className="mt-4 text-brun/75">
                      {space.text}
                    </p>
                  </div>
                  <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 md:col-span-8">
                    {items.map((p, i) => (
                      <div key={p.id}>
                        <ProductCard product={p} index={i} mood={i % 2 ? "jour" : "nuit"} />
                        <p className="t-small mt-3 text-brun/70">{proUse(p.slug)!.use}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-creme py-28 md:py-40">
        <div className="container-luxe">
          <Eyebrow number="02">Votre projet</Eyebrow>
          <div className="mt-14 grid gap-x-10 gap-y-14 md:grid-cols-3">
            {SERVICE.map((s, i) => (
              <div
                key={s.title}
                data-reveal
                data-reveal-delay={String(i * 0.12)}
                className="border-t border-brun/15 pt-8"
              >
                <h2 className="t-h3">{s.title}</h2>
                <p className="mt-4 text-brun/75">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 max-w-3xl">
            <h3 className="t-eyebrow text-champagne">Remise professionnelle</h3>
            <table className="mt-5 w-full max-w-md text-left">
              <thead>
                <tr className="t-small border-b border-brun/15 text-brun/60">
                  <th className="pb-3 font-normal">Montant HT des pièces</th>
                  <th className="pb-3 text-right font-normal">Remise</th>
                </tr>
              </thead>
              <tbody>
                {PRO_TIERS.map((t) => (
                  <tr key={t.min} className="border-b border-brun/10">
                    <td className="py-3">Dès {formatPrice(t.min)} HT</td>
                    <td className="py-3 text-right font-serif text-xl">−{t.percent} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="t-small mt-5 text-brun/70">
              Montant hors taxes des pièces commandées, hors livraison. Pour un compte entreprise
              validé, la remise s’applique automatiquement dans le panier ; sinon, sur devis. La
              remise s’applique aux pièces qui ne sont pas déjà en promotion
              {promoNames.length > 0 ? ` (aujourd’hui : ${promoNames.join(", ")})` : ""} ; ces
              dernières comptent toutefois pour atteindre le palier.
            </p>
          </div>
          <p className="t-small mt-6 max-w-3xl border-l border-champagne pl-4 text-brun/70">
            Dans un établissement recevant du public, l’installation doit respecter les règles de
            sécurité qui s’appliquent à votre établissement. Faites valider le choix et la pose des
            luminaires par votre électricien ou votre bureau de contrôle.
          </p>
          <div className="mt-12">
            <ButtonLink href={PRO_CONTACT_HREF}>Demander une sélection et un devis</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
