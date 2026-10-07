import { ButtonLink, Container, EmptyState, Section } from "@vaeloria/ui";

export default function FactionNotFound() {
  return (
    <Section>
      <Container className="max-w-xl">
        <EmptyState title="Faction introuvable">
          Cette faction n&apos;existe pas dans la saison en cours, ou elle a été dissoute.
          <div className="mt-4"><ButtonLink href="/leaderboards/factions" variant="secondary">Classement des factions</ButtonLink></div>
        </EmptyState>
      </Container>
    </Section>
  );
}
