import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiClientError } from "@vaeloria/api-client";
import { Badge, Card, Container, Section, StatCard, Table, formatDate, formatNumber, skinHead } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 60;

async function load(name: string) {
  try {
    return await api.faction(name);
  } catch (e) {
    if (e instanceof ApiClientError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

const ROLE: Record<string, string> = { LEADER: "Leader", OFFICER: "Officier", MEMBER: "Membre", RECRUIT: "Recrue" };

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const f = await load(decodeURIComponent(name)).catch(() => null);
  if (!f) return pageMeta({ title: "Faction introuvable", description: "Cette faction n'existe pas ou a été dissoute.", path: `/faction/${name}`, noindex: true });
  return pageMeta({ title: `Faction ${f.name}`, description: f.description ?? `${f.name} : ${f.members.length} membres, ${f.claims} claims, classée #${f.rank ?? "—"} sur VÆLORIA.`, path: `/faction/${f.name}` });
}

export default async function FactionPage({ params }: { params: Promise<{ name: string }> }) {
  const f = await load(decodeURIComponent((await params).name));
  if (!f) notFound();
  return (
    <>
      <PageHeader title={f.name} eyebrow="Faction" description={f.description ?? undefined} crumbs={[{ name: "Classements", path: "/classements" }, { name: f.name, path: `/faction/${f.name}` }]}>
        <div className="flex flex-wrap gap-2">
          {f.rank && <Badge tone="accent">#{f.rank} de la saison</Badge>}
          <Badge>Fondée le {formatDate(f.createdAt)}</Badge>
          {f.leader && <Badge>Leader : {f.leader.username}</Badge>}
        </div>
      </PageHeader>
      <Section>
        <Container className="space-y-10">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Power" value={`${formatNumber(f.power)}/${formatNumber(f.maxPower)}`} hint={f.power < f.claims ? "Raidable" : undefined} />
            <StatCard label="Claims" value={formatNumber(f.claims)} />
            <StatCard label="Membres" value={f.members.length} />
            <StatCard label="Kills" value={formatNumber(f.kills)} />
            <StatCard label="Richesse" value={`${formatNumber(Math.round(f.wealth))} $`} />
            <StatCard label="KOTH" value={formatNumber(f.kothCaptures)} />
          </div>
          <Card className="p-0 sm:p-0">
            <h2 className="px-5 pt-5 font-semibold">Membres</h2>
            <div className="p-5 pt-3">
              <Table head={["Joueur", "Rôle"]}>
                {f.members.map((m) => (
                  <tr key={m.uuid}>
                    <td>
                      <Link href={`/joueur/${m.username}`} className="flex items-center gap-3 font-semibold hover:text-accent">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={skinHead(m.uuid, 32)} alt="" width={24} height={24} loading="lazy" className="size-6 rounded [image-rendering:pixelated]" />
                        {m.username}
                      </Link>
                    </td>
                    <td className="text-muted">{ROLE[m.role] ?? m.role}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </Card>
        </Container>
      </Section>
    </>
  );
}
