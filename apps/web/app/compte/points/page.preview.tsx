import { ButtonLink, Container, EmptyState, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Mon compte", description: "Ton compte VÆLORIA.", path: "/compte", noindex: true });

export default function AccountPreview() {
  return (
    <>
      <PageHeader title="Mon compte" crumbs={[{ name: "Mon compte", path: "/compte" }]} />
      <Section><Container className="max-w-xl"><EmptyState title="Les comptes ouvriront avec le serveur">Connexion Discord, liaison Minecraft, points et historique des commandes.<div className="mt-4"><ButtonLink href="/boutique" variant="secondary">Voir la boutique</ButtonLink></div></EmptyState></Container></Section>
    </>
  );
}
