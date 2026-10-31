import Link from "next/link";

/** Affiché tant que le site tourne sur le catalogue fictif. */
export function DemoBanner() {
  return (
    <div className="relative z-[55] bg-brun px-4 py-2 text-center text-[0.7rem] tracking-[0.08em] text-ivoire/85">
      Aperçu du showroom — les pièces présentées sont{" "}
      <strong className="font-semibold text-ivoire">fictives</strong> et la boutique n’est pas
      encore ouverte.{" "}
      <Link href="/maison#ouverture" className="underline underline-offset-4">
        En savoir plus
      </Link>
    </div>
  );
}
