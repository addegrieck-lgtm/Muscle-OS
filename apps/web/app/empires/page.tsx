import { ButtonLink, Container, EmptyState, Section, formatNumber } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";
import { EmpireBrowser } from "./EmpireBrowser";

export const revalidate = 20;
export const metadata = pageMeta({
  title: "Les empires de VÆLORIA",
  description: "Tous les empires de VÆLORIA : influence, membres, territoires, guerres. Trouve ton camp ou fonde le tien.",
  path: "/empires",
});

export default async function EmpiresPage() {
  const data = await orNull(api.empires());
  return (
    <>
      <PageHeader eyebrow="Empires" title="Les empires de VÆLORIA" description={data?.total ? `${formatNumber(data.total)} empire${data.total > 1 ? "s" : ""} fondé${data.total > 1 ? "s" : ""}. Chaque faction peut devenir un empire.` : "Chaque faction peut devenir un empire."} crumbs={[{ name: "Empires", path: "/empires" }]}>
        <ButtonLink href="/empires/creer" data-track="cta_click" data-track-id="empires-creer">Fonder mon empire</ButtonLink>
      </PageHeader>
      <Section>
        <Container>{data ? <EmpireBrowser empires={data.items} /> : <EmptyState title="Empires momentanément indisponibles" />}</Container>
      </Section>
    </>
  );
}
