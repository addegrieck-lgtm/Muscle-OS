import { ButtonLink, Eyebrow } from "@/components/ui/Button";
import { PRO_DISCOUNT_MIN_LABEL, PRO_DISCOUNT_PERCENT } from "@/lib/catalog/pro";
import { PRO_SPACES } from "@/lib/content/restauration";

/** Accueil : mise en avant des pièces pour restaurants, bars et hôtels. */
export function Professionals() {
  return (
    <section className="bg-creme py-28 md:py-40" aria-labelledby="pro-title">
      <div className="container-luxe grid gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <Eyebrow>Restaurants, bars et hôtels</Eyebrow>
          <h2 id="pro-title" data-reveal className="t-h2 mt-6">
            Des pièces pensées aussi pour recevoir.
          </h2>
          <p data-reveal className="mt-6 text-brun/75">
            Au-dessus des tables, le long d’un comptoir, dans un hall ou en terrasse : une grande
            partie de nos luminaires trouvent naturellement leur place en restauration et en
            hôtellerie. Nous vous aidons à composer la lumière de votre établissement, avec{" "}
            {PRO_DISCOUNT_PERCENT} % de remise professionnelle dès {PRO_DISCOUNT_MIN_LABEL} d’achat,
            sur devis.
          </p>
          <div data-reveal className="mt-10">
            <ButtonLink href="/restauration" variant="outline">
              Découvrir la sélection
            </ButtonLink>
          </div>
        </div>
        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2 md:col-span-6 md:col-start-7">
          {PRO_SPACES.map((s, i) => (
            <li
              key={s.id}
              data-reveal
              data-reveal-delay={String((i % 2) * 0.12)}
              className="border-t border-brun/15 pt-6"
            >
              <h3 className="t-h3">{s.title}</h3>
              <p className="t-small mt-3 text-brun/70">{s.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
