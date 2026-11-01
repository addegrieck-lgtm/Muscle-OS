import Link from "next/link";

/** Bandeau d'aperçu : catalogue fictif, ou boutique réelle pas encore ouverte. */
export function DemoBanner({ variant = "demo" }: { variant?: "demo" | "preparation" }) {
  return (
    <div className="relative z-[55] bg-brun px-4 py-2 text-center text-[0.7rem] tracking-[0.08em] text-ivoire/85">
      {variant === "demo" ? (
        <>
          Aperçu du showroom — les pièces présentées sont{" "}
          <strong className="font-semibold text-ivoire">fictives</strong> et la boutique n’est pas
          encore ouverte.{" "}
        </>
      ) : (
        <>Maison en préparation — la boutique en ligne ouvrira prochainement. </>
      )}
      <Link href="/maison#ouverture" className="underline underline-offset-4">
        En savoir plus
      </Link>
    </div>
  );
}
