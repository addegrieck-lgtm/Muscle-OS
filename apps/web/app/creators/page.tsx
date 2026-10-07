import { LINKS } from "@vaeloria/config";
import { ButtonLink, Card, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Programme créateurs", description: "Tu crées du contenu Minecraft PvP/Faction ? Rejoins le programme créateurs VÆLORIA.", path: "/creators" });

const PERKS = [
  { title: "Code créateur", body: "Un code personnel que ta communauté utilise à l'inscription. Les joueurs apportés sont comptabilisés." },
  { title: "Accès anticipé", body: "Tests des nouveautés avant leur sortie pour préparer ton contenu." },
  { title: "Mise en avant", body: "Tes vidéos relayées sur nos réseaux et notre Discord." },
];

export default function CreatorsPage() {
  return (
    <>
      <PageHeader eyebrow="Créateurs" title="Programme créateurs" description="TikTok, YouTube, Twitch : on cherche des créateurs qui aiment le PvP et le Faction." crumbs={[{ name: "Créateurs", path: "/creators" }]}>
        <ButtonLink href={LINKS.discord} external data-track="click_discord">Candidater via Discord</ButtonLink>
      </PageHeader>
      <Section>
        <Container className="grid gap-3 md:grid-cols-3">
          {PERKS.map((p) => <Card key={p.title}><p className="font-semibold">{p.title}</p><p className="mt-2 text-sm text-muted">{p.body}</p></Card>)}
        </Container>
      </Section>
    </>
  );
}
