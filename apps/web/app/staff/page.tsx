import { Card, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "L'équipe", description: "L'équipe qui fait tourner VÆLORIA : administration, modération, développement.", path: "/staff" });

// Les membres sont à renseigner — aucune personne n'est inventée ici.
const TEAMS = [
  { role: "Administration", desc: "Direction du projet, équilibrage, décisions finales.", members: ["[À RENSEIGNER]"] },
  { role: "Modération", desc: "Application du règlement en jeu et sur Discord.", members: ["[À RENSEIGNER]"] },
  { role: "Développement", desc: "Plugins, site, infrastructure.", members: ["[À RENSEIGNER]"] },
];

export default function StaffPage() {
  return (
    <>
      <PageHeader eyebrow="Staff" title="L'équipe" description="Tu veux rejoindre le staff ? Les recrutements sont annoncés sur Discord." crumbs={[{ name: "Staff", path: "/staff" }]} />
      <Section>
        <Container className="grid gap-3 md:grid-cols-3">
          {TEAMS.map((t) => (
            <Card key={t.role}>
              <p className="font-display text-lg font-bold">{t.role}</p>
              <p className="mt-1 text-sm text-muted">{t.desc}</p>
              <ul className="mt-3 text-sm">{t.members.map((m) => <li key={m}>{m}</li>)}</ul>
            </Card>
          ))}
        </Container>
      </Section>
    </>
  );
}
