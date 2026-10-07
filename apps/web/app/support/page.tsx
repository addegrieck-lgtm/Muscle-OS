import { LINKS } from "@vaeloria/config";
import { ButtonLink, Card, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Support", description: "Besoin d'aide sur VÆLORIA ? Problème de connexion, achat, sanction ou bug : voici comment nous contacter.", path: "/support" });

const CASES = [
  { title: "Problème de connexion", body: "Vérifie ta version (Java 1.21) et l'IP play.vaeloria.fr, puis consulte la page Statut.", href: "/status", cta: "Voir le statut" },
  { title: "Achat non reçu", body: "Ouvre un ticket Discord avec ton numéro de commande (VAL-AAAA-NNNNNN). Les livraisons sont tracées : rien n'est perdu.", href: LINKS.discord, cta: "Ouvrir un ticket", external: true },
  { title: "Contester une sanction", body: "Ouvre un ticket Discord en expliquant la situation. Reste factuel : chaque sanction est journalisée.", href: LINKS.discord, cta: "Ouvrir un ticket", external: true },
  { title: "Signaler un bug ou un tricheur", body: "Ticket Discord avec preuves (vidéo, captures). Ne partage pas un bug publiquement.", href: LINKS.discord, cta: "Signaler", external: true },
];

export default function SupportPage() {
  return (
    <>
      <PageHeader eyebrow="Support" title="Besoin d'aide ?" description="Le support passe par les tickets Discord : réponse plus rapide et suivi de ta demande." crumbs={[{ name: "Support", path: "/support" }]} />
      <Section>
        <Container className="grid gap-3 sm:grid-cols-2">
          {CASES.map((c) => (
            <Card key={c.title} className="flex flex-col">
              <p className="font-semibold">{c.title}</p>
              <p className="mt-2 flex-1 text-sm text-muted">{c.body}</p>
              <ButtonLink href={c.href} external={c.external} variant="secondary" size="sm" className="mt-4 self-start">{c.cta}</ButtonLink>
            </Card>
          ))}
        </Container>
      </Section>
    </>
  );
}
