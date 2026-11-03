import { NewPasswordForm } from "@/components/account/AccountForms";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Nouveau mot de passe",
  description: "Choisissez un nouveau mot de passe.",
  path: "/compte/nouveau-mot-de-passe",
  noindex: true,
});

export default function NewPasswordPage() {
  return (
    <>
      <PageHeader eyebrow="Compte" title="Nouveau mot de passe." />
      <div className="container-luxe max-w-xl pb-32">
        <NewPasswordForm />
      </div>
    </>
  );
}
