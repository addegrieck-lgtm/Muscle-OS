import { LINKS } from "@vaeloria/config";
import { ButtonLink, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Discord", description: "Rejoins le Discord VÆLORIA : annonces, recrutement de factions, événements et support.", path: "/discord" });

// Page intermédiaire (et non redirection directe) : lien partageable, mesurable, et utile pour le SEO.
export default function DiscordPage() {
  return (
    <>
      <PageHeader eyebrow="Communauté" title="Le Discord VÆLORIA" description="Annonces, patch notes, recrutement de factions, rappels d'événements, tickets de support." crumbs={[{ name: "Discord", path: "/discord" }]}>
        <ButtonLink href={LINKS.discord} external size="lg" data-track="click_discord">Rejoindre le Discord</ButtonLink>
      </PageHeader>
      <Section><Container><p className="text-sm text-muted">Le lien ne s&apos;ouvre pas ? Copie-le : <span className="font-mono text-fg">{LINKS.discord}</span></p></Container></Section>
    </>
  );
}
