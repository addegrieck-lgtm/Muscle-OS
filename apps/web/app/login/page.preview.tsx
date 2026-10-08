import { Card, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";
import { PreviewAuthForms } from "./PreviewAuthForms";

export const metadata = pageMeta({ title: "Connexion", description: "Connexion au compte VÆLORIA.", path: "/login", noindex: true });

/** Aperçu statique : le formulaire réel, avec un avertissement clair (aucun compte n'est créé ici). */
export default function LoginPage() {
  return (
    <>
      <PageHeader title="Ton compte VÆLORIA" eyebrow="Compte VÆLORIA" crumbs={[{ name: "Connexion", path: "/login" }]} description="Numéro de fondateur, empire, votes au Conseil, boutique." />
      <Section>
        <Container className="max-w-md">
          <Card className="space-y-5">
            <p className="rounded-md border border-line bg-surface-2 p-3 text-xs text-muted">
              Aperçu : les comptes seront actifs à l&apos;ouverture du site officiel.
            </p>
            <PreviewAuthForms />
            <p className="text-sm text-muted">Ensuite, lie ton compte Minecraft avec la commande <code className="rounded bg-surface-2 px-1 text-fg">/link</code> en jeu pour suivre tes points et tes grades.</p>
          </Card>
        </Container>
      </Section>
    </>
  );
}
