import Link from "next/link";
import { SignupForm } from "@/components/account/AccountForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Créer un compte",
  description: "Créez votre compte LUMÉANCE : Cercle Luméance, parrainage ou compte entreprise.",
  path: "/compte/inscription",
  noindex: true,
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ parrain?: string | string[] }>;
}) {
  const raw = (await searchParams).parrain;
  const referral = (typeof raw === "string" ? raw : "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
  return (
    <>
      <PageHeader
        eyebrow="Compte"
        title="Créer votre compte."
        intro={
          <>
            Particulier : vos achats vous font entrer dans le{" "}
            <Link href="/avantages" className="underline underline-offset-4">
              Cercle Luméance
            </Link>
            . Entreprise : prix HT et remise par paliers dès validation.
          </>
        }
      />
      <div className="container-luxe max-w-2xl pb-32">
        <SignupForm referral={referral} />
        <p className="t-small mt-10 text-brun/60">
          Déjà un compte ?{" "}
          <Link href="/compte/connexion" className="underline underline-offset-4">
            Se connecter
          </Link>
        </p>
      </div>
    </>
  );
}
