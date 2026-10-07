import { ButtonLink, Container, Section } from "@vaeloria/ui";

export default function NotFound() {
  return (
    <Section>
      <Container className="flex flex-col items-center py-10 text-center">
        <p className="metal-text font-display text-6xl font-bold">404</p>
        <h1 className="mt-4 text-xl font-semibold">Cette page n&apos;existe pas</h1>
        <p className="mt-2 text-muted">Elle a peut-être été raidée.</p>
        <ButtonLink href="/" className="mt-6">Retour à l&apos;accueil</ButtonLink>
      </Container>
    </Section>
  );
}
