import { SigninForm } from "@/components/account/AccountForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Se connecter",
  description: "Accédez à votre compte LUMÉANCE.",
  path: "/compte/connexion",
  noindex: true,
});

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ lien?: string; suite?: string }>;
}) {
  const { lien, suite } = await searchParams;
  const next = suite && suite.startsWith("/") && !suite.startsWith("//") ? suite : "/compte";
  return (
    <>
      <PageHeader eyebrow="Compte" title="Bon retour parmi nous." />
      <div className="container-luxe max-w-xl pb-32">
        {lien === "confirme" && (
          <p role="status" className="t-small mb-8 border-l border-champagne px-4 py-3 text-brun">
            Votre adresse est confirmée. Connectez-vous avec votre e-mail et votre mot de passe.
          </p>
        )}
        {lien === "expire" && (
          <p
            role="alert"
            className="t-small mb-8 border-l border-[#8a3b2a] px-4 py-3 text-[#8a3b2a]"
          >
            Ce lien a expiré ou a déjà été utilisé. Connectez-vous, ou demandez un nouveau lien.
          </p>
        )}
        <SigninForm next={next} />
      </div>
    </>
  );
}
