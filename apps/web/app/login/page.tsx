import { Card, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Connexion", description: "Connexion au compte VÆLORIA.", path: "/login", noindex: true });

/**
 * Phase 7 (authentification) non livrée : la page décrit le fonctionnement prévu
 * au lieu d'afficher un faux formulaire. Voir docs/AUTHENTICATION.md.
 */
export default function LoginPage() {
  return (
    <>
      <PageHeader title="Connexion" crumbs={[{ name: "Connexion", path: "/login" }]} description="Les comptes VÆLORIA arrivent bientôt." />
      <Section>
        <Container className="max-w-xl">
          <Card className="space-y-3">
            <p className="font-semibold">Comment ça marchera</p>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>Connexion avec ton compte <strong className="text-fg">Discord</strong> — aucun mot de passe à créer.</li>
              <li>En jeu, tape <code className="rounded bg-surface-2 px-1 text-fg">/link</code> pour obtenir un code temporaire.</li>
              <li>Saisis le code sur le site : ton compte Minecraft est lié à ton compte VÆLORIA.</li>
            </ol>
            <button type="button" disabled className="mt-2 h-11 w-full rounded-lg border border-line text-sm font-semibold text-subtle">Connexion Discord — bientôt disponible</button>
          </Card>
        </Container>
      </Section>
    </>
  );
}
