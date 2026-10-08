import Link from "next/link";
import type { FounderRow } from "@vaeloria/types";
import { ButtonLink, Container, EmptyState, Section, Table, formatNumber } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { FounderCounter, MilestoneTrack } from "@/components/world/Founders";
import { Tabs } from "@/components/world/Tabs";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 30;
export const metadata = pageMeta({
  title: "Les fondateurs de VÆLORIA",
  description: "Le registre des fondateurs de VÆLORIA : numéro, empire, invitations et influence des premiers habitants du monde.",
  path: "/fondateurs",
});

function FounderTable({ rows }: { rows: FounderRow[] }) {
  if (!rows.length) return <EmptyState title="Aucun fondateur pour l'instant">Le registre s&apos;ouvre avec les premières inscriptions.</EmptyState>;
  return (
    <Table head={["N°", "Joueur", "Empire", "Invitations", "Influence"]}>
      {rows.map((f) => (
        <tr key={f.number}>
          <td className="w-16 font-bold tabular-nums text-accent">#{f.number}</td>
          <td className="font-semibold">{f.username ? <Link href={`/joueur/${encodeURIComponent(f.username)}`} className="hover:text-accent">{f.name}</Link> : f.name}</td>
          <td>{f.empireSlug ? <Link href={`/empire/${f.empireSlug}`} className="hover:text-accent">{f.empire}</Link> : <span className="text-subtle">—</span>}</td>
          <td className="text-right tabular-nums">{formatNumber(f.invites)}</td>
          <td className="text-right font-semibold tabular-nums">{formatNumber(f.influence)}</td>
        </tr>
      ))}
    </Table>
  );
}

export default async function FoundersPage() {
  const [stats, byNumber, byRecruit, byInfluence] = await Promise.all([
    orNull(api.founders()),
    orNull(api.founderList("number")),
    orNull(api.founderList("recruiters")),
    orNull(api.founderList("influence")),
  ]);
  return (
    <>
      <PageHeader eyebrow="Fondateurs" title={`Les ${formatNumber(stats?.cap ?? 3000)} fondateurs`} description="Les premiers habitants de VÆLORIA. Chaque numéro est unique et ne sera jamais réattribué." crumbs={[{ name: "Fondateurs", path: "/fondateurs" }]}>
        <ButtonLink href="/rejoindre" data-track="cta_click" data-track-id="fondateurs-header">Devenir fondateur</ButtonLink>
      </PageHeader>
      {stats && (
        <Section>
          <Container className="space-y-8">
            <FounderCounter stats={stats} className="max-w-md" />
            <MilestoneTrack stats={stats} />
          </Container>
        </Section>
      )}
      <Section className="border-t border-line/60">
        <Container className="max-w-4xl">
          {byNumber ? (
            <Tabs label="Tri du registre" tabs={[
              { id: "numero", label: "Registre", content: <FounderTable rows={byNumber.items} /> },
              { id: "recruteurs", label: "Top recruteurs", content: <FounderTable rows={byRecruit?.items ?? []} /> },
              { id: "influence", label: "Influence", content: <FounderTable rows={byInfluence?.items ?? []} /> },
            ]} />
          ) : (
            <EmptyState title="Registre momentanément indisponible" />
          )}
          {byNumber && byNumber.total > byNumber.items.length && <p className="mt-4 text-sm text-muted">{formatNumber(byNumber.items.length)} premiers sur {formatNumber(byNumber.total)} fondateurs.</p>}
        </Container>
      </Section>
    </>
  );
}
