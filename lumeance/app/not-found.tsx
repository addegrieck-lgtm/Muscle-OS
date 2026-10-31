import Link from "next/link";
import { LogoSymbol } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center bg-noir px-6 text-center text-ivoire">
      <LogoSymbol className="h-20 w-20" />
      <p className="t-eyebrow mt-10 text-champagne">Erreur 404</p>
      <h1 className="t-h2 mt-4">Cette page s’est éteinte.</h1>
      <p className="mt-4 max-w-md text-ivoire/70">
        La page demandée n’existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="t-eyebrow mt-10 border border-ivoire/30 px-8 py-4 hover:border-champagne"
      >
        Retour à l’accueil
      </Link>
    </main>
  );
}
