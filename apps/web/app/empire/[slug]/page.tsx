import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Container, EmptyState, Section, StatCard, Table, formatDate, formatNumber } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { Crest } from "@/components/world/Crest";
import { TrackView } from "@/components/world/TrackView";
import { api, orNull } from "@/lib/api";
import { PREVIEW } from "@/lib/preview";
import { pageMeta } from "@/lib/seo";
import { EmpireActions } from "./EmpireActions";

export const revalidate = 20;
const ROLE = { leader: "Chef", officer: "Officier", member: "Membre" } as const;

export async function generateStaticParams() {
  const slugs = (await orNull(api.empires()))?.items.map((e) => e.slug) ?? [];
  return (slugs.length ? slugs : PREVIEW ? ["indisponible"] : []).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const e = await orNull(api.empire((await params).slug));
  if (!e) return {};
  return pageMeta({ title: `${e.name} [${e.tag}] — Empire`, description: e.motto ? `« ${e.motto} » — ${e.name}, empire de VÆLORIA : ${e.members} membres, ${e.territories} territoires.` : `${e.name}, empire de VÆLORIA : ${e.members} membres, ${e.territories} territoires.`, path: `/empire/${e.slug}` });
}

export default async function EmpirePage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await orNull(api.empire((await params).slug));
  if (!e) notFound();
  return (
    <>
      <TrackView name="empire_view" id={e.slug} />
      <PageHeader eyebrow={`Empire #${e.rank}`} title={e.name} crumbs={[{ name: "Empires", path: "/empires" }, { name: e.name, path: `/empire/${e.slug}` }]}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Crest crest={e.crest} color={e.color} className="size-24" title={`Blason de ${e.name}`} />
          <div className="space-y-3">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-subtle">[{e.tag}]{e.factionName ? ` · Faction ${e.factionName}` : ""}</p>
            {e.motto && <p className="text-lg italic text-muted">« {e.motto} »</p>}
            <div className="flex flex-wrap gap-1.5">
              {e.wars.active > 0 && <Badge tone="danger">En guerre</Badge>}
              {e.recruiting ? <Badge tone="success">Recrute</Badge> : <Badge>Sur invitation</Badge>}
              <Badge>Fondé le {formatDate(e.createdAt)}</Badge>
            </div>
          </div>
        </div>
        <div className="mt-6"><EmpireActions slug={e.slug} name={e.name} recruiting={e.recruiting} /></div>
      </PageHeader>
      <Section>
        <Container className="space-y-10">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Influence" value={formatNumber(e.influence)} />
            <StatCard label="Membres" value={formatNumber(e.members)} />
            <StatCard label="Territoires" value={formatNumber(e.territories)} hint={e.factionName ? undefined : "Liés au serveur au lancement"} />
            <StatCard label="Guerres" value={`${e.wars.won} V · ${e.wars.lost} D`} />
          </div>
          {e.description && <p className="max-w-3xl whitespace-pre-line text-muted">{e.description}</p>}
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-[0.05em]">Membres</h2>
              <Table head={["Joueur", "Rôle", "Influence"]}>
                {e.roster.map((m, i) => (
                  <tr key={`${m.name}-${i}`}>
                    <td className="font-semibold">
                      {m.username ? <Link href={`/joueur/${encodeURIComponent(m.username)}`} className="hover:text-accent">{m.name}</Link> : m.name}
                      {m.founder && <span className="ml-2 text-xs text-subtle">Fondateur #{m.founder}</span>}
                    </td>
                    <td>{ROLE[m.role]}</td>
                    <td className="text-right tabular-nums">{formatNumber(m.influence)}</td>
                  </tr>
                ))}
              </Table>
            </div>
            <div>
              <h2 className="mb-3 font-display text-xl font-bold uppercase tracking-[0.05em]">Guerres</h2>
              {e.history.length ? (
                <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
                  {e.history.map((w) => (
                    <li key={w.slug}>
                      <Link href={`/guerre/${w.slug}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-surface-2">
                        <span><span className="font-semibold">{w.title}</span><span className="block text-xs text-subtle">contre {w.opponent} · {formatDate(w.startsAt)}</span></span>
                        {w.status === "active" ? <Badge tone="danger">En cours</Badge> : w.won === true ? <Badge tone="success">Victoire</Badge> : w.won === false ? <Badge>Défaite</Badge> : <Badge>{w.status === "planned" ? "À venir" : "Terminée"}</Badge>}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Aucune guerre pour l'instant">L&apos;histoire de cet empire reste à écrire.</EmptyState>
              )}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
