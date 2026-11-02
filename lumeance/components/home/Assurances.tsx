import Link from "next/link";

const ITEMS = [
  {
    title: "Livraison offerte",
    text: "Sur toutes les pièces, en France métropolitaine.",
    href: "/livraison",
  },
  {
    title: "14 jours pour changer d’avis",
    text: "Droit de rétractation à réception.",
    href: "/retours",
  },
  { title: "Garantie légale de 2 ans", text: "Conformité et vices cachés.", href: "/retours" },
  {
    title: "Conseil personnalisé",
    text: "Taille, hauteur, installation : écrivez-nous.",
    href: "/contact",
  },
];

/** Accueil : nos engagements, en une ligne. */
export function Assurances() {
  return (
    <section aria-label="Nos engagements" className="border-b border-brun/10 bg-ivoire">
      <ul className="container-luxe grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:grid-cols-4 md:py-12">
        {ITEMS.map((it) => (
          <li key={it.title}>
            <Link href={it.href} className="group block">
              <p className="t-eyebrow text-brun transition-colors group-hover:text-champagne">
                {it.title}
              </p>
              <p className="t-small mt-2 text-brun/60">{it.text}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
