import { Badge, Container, EmptyState, Section, formatDate } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { VideoEmbed } from "@/components/world/VideoEmbed";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 120;
export const metadata = pageMeta({
  title: "Journal — VÆLORIA se construit en public",
  description: "Le journal de bord de VÆLORIA : épisodes vidéo, coulisses et étapes de la construction du serveur, en public.",
  path: "/journal",
});

const KIND = { video: "Vidéo", short: "Short", update: "Mise à jour", coulisses: "Coulisses", milestone: "Étape" } as const;

export default async function JournalPage() {
  const data = await orNull(api.journal());
  return (
    <>
      <PageHeader eyebrow="Journal" title="VÆLORIA se construit en public." description="Chaque étape, chaque décision, chaque coulisse. Suis la construction du monde épisode par épisode." crumbs={[{ name: "Journal", path: "/journal" }]} />
      <Section>
        <Container className="max-w-4xl">
          {!data && <EmptyState title="Journal momentanément indisponible" />}
          {data && data.items.length === 0 && <EmptyState title="Le premier épisode arrive bientôt" />}
          <ol className="space-y-10">
            {data?.items.map((j) => (
              <li key={j.slug} id={j.slug} className="grid gap-5 border-b border-line pb-10 last:border-0 md:grid-cols-[1fr_1.2fr]">
                <div>
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-accent">{j.episode ? `Épisode ${String(j.episode).padStart(2, "0")}` : KIND[j.kind]}</p>
                  <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-[0.04em]">{j.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{KIND[j.kind]}</Badge>
                    {j.publishedAt ? <Badge tone="success">Publié le {formatDate(j.publishedAt)}</Badge> : <Badge tone="warning">Bientôt</Badge>}
                  </div>
                  <p className="mt-3 text-muted">{j.summary}</p>
                  {j.publishedAt && j.body && <p className="mt-3 whitespace-pre-line text-sm text-muted">{j.body}</p>}
                </div>
                {j.publishedAt && j.videoUrl ? (
                  <VideoEmbed url={j.videoUrl} title={j.title} thumbnail={j.thumbnailUrl} />
                ) : (
                  <div className="grid aspect-video place-items-center rounded-[var(--radius-card)] border border-dashed border-line text-sm text-subtle">{j.publishedAt ? "Épisode écrit" : "À venir"}</div>
                )}
              </li>
            ))}
          </ol>
        </Container>
      </Section>
    </>
  );
}
