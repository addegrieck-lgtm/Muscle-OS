import { confirmEmailLink } from "@/app/actions/account";
import { buttonClass } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Confirmation",
  description: "Confirmez votre adresse e-mail.",
  path: "/compte/confirmation",
  noindex: true,
});

type Params = { token_hash?: string; type?: string; code?: string; next?: string };

/** Page d'arrivée des liens envoyés par e-mail : la validation se fait au clic sur le bouton. */
export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  const recovery = p.type === "recovery" || (p.next ?? "").includes("mot-de-passe");
  const valid = Boolean(p.token_hash || p.code);
  return (
    <>
      <PageHeader
        eyebrow="Compte"
        title={recovery ? "Nouveau mot de passe." : "Confirmer votre adresse."}
        intro={
          valid
            ? recovery
              ? "Cliquez ci-dessous pour choisir un nouveau mot de passe."
              : "Un dernier clic pour activer votre compte."
            : "Ce lien est incomplet. Demandez-en un nouveau depuis la page de connexion."
        }
      />
      <div className="container-luxe max-w-xl pb-32">
        {valid && (
          <form action={confirmEmailLink}>
            {(["token_hash", "type", "code", "next"] as const).map((k) =>
              p[k] ? <input key={k} type="hidden" name={k} value={p[k]} /> : null,
            )}
            <button type="submit" className={buttonClass("solid", "w-full")}>
              {recovery ? "Choisir un nouveau mot de passe" : "Confirmer mon adresse"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
