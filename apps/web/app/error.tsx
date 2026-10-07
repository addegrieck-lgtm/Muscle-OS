"use client";

import { Button, Container, Section } from "@vaeloria/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Section>
      <Container className="flex flex-col items-center py-10 text-center">
        <h1 className="text-xl font-semibold">Données momentanément indisponibles</h1>
        <p className="mt-2 text-muted">Le service ne répond pas. Consulte la page <a href="/status" className="underline">Statut</a> ou réessaie.</p>
        <Button onClick={reset} className="mt-6">Réessayer</Button>
      </Container>
    </Section>
  );
}
