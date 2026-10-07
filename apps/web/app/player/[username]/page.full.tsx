import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Container, Section, StatCard, formatDate, formatDuration, formatNumber, skinHead } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { pageMeta } from "@/lib/seo";
import { ApiClientError } from "@vaeloria/api-client";

export const revalidate = 60;

async function load(username: string) {
  try {
    return await api.player(username);
  } catch (e) {
    if (e instanceof ApiClientError && (e.status === 404 || e.status === 400)) return null;
    throw e; // API indisponible → page d'erreur, pas un faux « joueur introuvable »
  }
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const p = await load(decodeURIComponent(username)).catch(() => null);
  if (!p) return pageMeta({ title: "Joueur introuvable", description: "Ce joueur n'a pas encore rejoint VÆLORIA.", path: `/player/${username}`, noindex: true });
  return pageMeta({
    title: `${p.username} — profil joueur`,
    description: `${p.username} sur VÆLORIA : ${p.stats.kills} kills, K/D ${p.stats.kd}${p.faction ? `, faction ${p.faction.name}` : ""}.`,
    path: `/player/${p.username}`,
  });
}

export default async function PlayerPage({ params }: { params: Promise<{ username: string }> }) {
  const p = await load(decodeURIComponent((await params).username));
  if (!p) notFound();
  return (
    <>
      <PageHeader title={p.username} eyebrow="Profil joueur" crumbs={[{ name: "Classements", path: "/leaderboards" }, { name: p.username, path: `/player/${p.username}` }]}>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={skinHead(p.uuid, 96)} alt={`Skin de ${p.username}`} width={72} height={72} className="size-18 rounded-lg [image-rendering:pixelated]" />
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{p.rank ?? "Joueur"}</Badge>
            {p.faction && (
              <Link href={`/faction/${encodeURIComponent(p.faction.name)}`}><Badge>{p.faction.name} · {p.faction.role.toLowerCase()}</Badge></Link>
            )}
          </div>
        </div>
      </PageHeader>
      <Section>
        <Container className="space-y-10">
          <div>
            <h2 className="mb-3 font-semibold">Saison en cours</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Kills" value={formatNumber(p.stats.kills)} />
              <StatCard label="Morts" value={formatNumber(p.stats.deaths)} />
              <StatCard label="K/D" value={p.stats.kd.toFixed(2)} />
              <StatCard label="KOTH" value={formatNumber(p.stats.kothCaptures)} />
              <StatCard label="Temps de jeu" value={formatDuration(p.stats.playtimeSeconds)} />
              {p.stats.power !== null && <StatCard label="Power faction" value={formatNumber(p.stats.power)} />}
              {p.stats.balance !== null && <StatCard label="Argent" value={`${formatNumber(Math.round(p.stats.balance))} $`} />}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="font-semibold">Succès</h2>
              {p.achievements.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {p.achievements.map((a) => <li key={a.id} className="flex justify-between"><span>{a.label}</span><span className="text-subtle">{formatDate(a.unlockedAt)}</span></li>)}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">Aucun succès débloqué pour l&apos;instant.</p>
              )}
            </Card>
            <Card>
              <h2 className="font-semibold">Historique</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Première connexion</dt><dd>{formatDate(p.firstSeenAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Dernière connexion</dt><dd>{p.lastSeenAt ? formatDate(p.lastSeenAt) : "—"}</dd></div>
              </dl>
            </Card>
          </div>
        </Container>
      </Section>
    </>
  );
}
