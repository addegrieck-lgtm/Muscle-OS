import Link from "next/link";
import { BRAND, LINKS } from "@vaeloria/config";
import { ButtonLink, Card, Container, Section, SectionHeader } from "@vaeloria/ui";
import { JoinSteps } from "@/components/JoinSteps";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Jouer sur VÆLORIA — IP, version, premiers pas",
  description: `Comment jouer sur ${BRAND.name} : Minecraft Java ${BRAND.minecraftVersion}, IP du serveur, compte, empire et premiers pas.`,
  path: "/jouer",
});

const NEXT = [
  { href: "/rejoindre", title: "Deviens fondateur", body: "Connecte-toi avec Discord : ton numéro de fondateur t'attend." },
  { href: "/empires", title: "Choisis ton camp", body: "Fonde ton empire ou rejoins-en un qui recrute." },
  { href: "/monde", title: "Découvre la carte", body: "Zones, territoires, KOTH : repère le terrain avant la guerre." },
  { href: "/rules", title: "Lis le règlement", body: "Fair-play, anti-triche, sanctions : les règles sont claires." },
];

export default function PlayPage() {
  return (
    <>
      <PageHeader eyebrow="Jouer" title="Prêt en 30 secondes" description={`Minecraft Java ${BRAND.minecraftVersion}, combat inspiré du 1.8, Faction compétitif. Aucun mod requis.`} crumbs={[{ name: "Jouer", path: "/jouer" }]} />
      <Section>
        <Container className="space-y-14">
          <JoinSteps />
          <div>
            <SectionHeader eyebrow="Ensuite" title="Ta place dans le monde" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {NEXT.map((n) => (
                <Link key={n.href} href={n.href} className="group block">
                  <Card className="h-full transition-colors group-hover:bg-surface-2">
                    <p className="font-display font-bold uppercase tracking-[0.05em] group-hover:text-accent">{n.title}</p>
                    <p className="mt-1 text-sm text-muted">{n.body}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/rejoindre" size="lg">Rejoindre VÆLORIA</ButtonLink>
            <ButtonLink href={LINKS.discord} external variant="secondary" size="lg" data-track="click_discord">Discord</ButtonLink>
            <ButtonLink href="/guides" variant="ghost" size="lg">Guides</ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
