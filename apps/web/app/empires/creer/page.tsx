import { Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";
import { EmpireCreator } from "./EmpireCreator";

export const metadata = pageMeta({
  title: "Fonder un empire",
  description: "Fonde ton empire sur VÆLORIA : nom, tag, devise, couleur et blason. Invite tes alliés avant le lancement.",
  path: "/empires/creer",
});

export default function CreateEmpirePage() {
  return (
    <>
      <PageHeader eyebrow="Empires" title="Fonder un empire" description="Choisis un nom, un tag, une devise et un blason. Ton empire existera avant même le lancement du serveur." crumbs={[{ name: "Empires", path: "/empires" }, { name: "Fonder", path: "/empires/creer" }]} />
      <Section>
        <Container className="max-w-5xl"><EmpireCreator /></Container>
      </Section>
    </>
  );
}
