import { BRAND } from "@vaeloria/config";
import { Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { FounderCounter, MilestoneTrack } from "@/components/world/Founders";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";
import { JoinFlow } from "./JoinFlow";

export const revalidate = 15;
export const metadata = pageMeta({
  title: "Rejoindre VÆLORIA — Deviens fondateur",
  description: `Rejoins ${BRAND.name} : connecte-toi avec Discord, obtiens ton numéro de fondateur, fonde ton empire et invite tes alliés.`,
  path: "/rejoindre",
});

export default async function JoinPage() {
  const founders = await orNull(api.founders());
  return (
    <>
      <PageHeader eyebrow="Rejoindre" title="Ta place dans l'histoire" description="Les premiers joueurs ne seront pas de simples joueurs. Ils seront les premiers habitants de VÆLORIA." crumbs={[{ name: "Rejoindre", path: "/rejoindre" }]} />
      <Section>
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_420px]">
          <div className="order-2 space-y-8 lg:order-1">
            {founders && <FounderCounter stats={founders} />}
            {founders && <MilestoneTrack stats={founders} />}
          </div>
          <div className="order-1 lg:order-2"><JoinFlow /></div>
        </Container>
      </Section>
    </>
  );
}
