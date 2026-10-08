import { ButtonLink, Container, EmptyState, Section } from "@vaeloria/ui";

export default function PlayerNotFound() {
  return (
    <Section>
      <Container className="max-w-xl">
        <EmptyState title="Joueur introuvable">
          Ce pseudo n&apos;a pas encore rejoint VÆLORIA — ou il a changé de pseudo.
          <div className="mt-4"><ButtonLink href="/classements" variant="secondary">Voir les classements</ButtonLink></div>
        </EmptyState>
      </Container>
    </Section>
  );
}
