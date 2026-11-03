import { ResetForm } from "@/components/account/AccountForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Mot de passe oublié",
  description: "Recevez un lien pour choisir un nouveau mot de passe.",
  path: "/compte/mot-de-passe-oublie",
  noindex: true,
});

export default function ResetPage() {
  return (
    <>
      <PageHeader
        eyebrow="Compte"
        title="Mot de passe oublié."
        intro="Indiquez l’adresse de votre compte : nous vous envoyons un lien pour en choisir un nouveau."
      />
      <div className="container-luxe max-w-xl pb-32">
        <ResetForm />
      </div>
    </>
  );
}
