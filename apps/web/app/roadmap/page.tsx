import { Container, EmptyState, Section, cn } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 300;
export const metadata = pageMeta({
  title: "Roadmap — de l'idée au lancement",
  description: "La feuille de route de VÆLORIA : PvP, factions, empires, guerres, bêta, 3 000 fondateurs, lancement. Où en est le projet ?",
  path: "/roadmap",
});

const STATUS = { done: "Terminé", current: "En cours", upcoming: "À venir" } as const;

export default async function RoadmapPage() {
  const data = await orNull(api.roadmap());
  return (
    <>
      <PageHeader eyebrow="Roadmap" title="De l'idée au lancement" description="Où en est VÆLORIA ? Chaque étape, son état réel. Touche une étape pour voir le détail." crumbs={[{ name: "Roadmap", path: "/roadmap" }]} />
      <Section>
        <Container className="max-w-3xl">
          {!data?.items.length ? (
            <EmptyState title="Roadmap momentanément indisponible" />
          ) : (
            <ol className="relative space-y-3 border-l border-line pl-6">
              {data.items.map((s, i) => (
                <li key={s.key} className="relative">
                  <span aria-hidden className={cn("absolute -left-[31px] top-5 size-3 rotate-45", s.status === "done" ? "bg-ruby" : s.status === "current" ? "border-2 border-ruby bg-bg" : "border border-line-strong bg-bg")} />
                  <details className={cn("group rounded-[var(--radius-card)] border p-4", s.status === "current" ? "metal-border" : "border-line")} open={s.status === "current"}>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="mr-2 font-display text-xs font-semibold tabular-nums text-subtle">{String(i + 1).padStart(2, "0")}</span>
                        <span className="font-display text-lg font-bold uppercase tracking-[0.05em]">{s.title}</span>
                      </span>
                      <span className={cn("font-display text-xs font-semibold uppercase tracking-[0.15em]", s.status === "done" ? "text-success" : s.status === "current" ? "text-accent" : "text-subtle")}>
                        {STATUS[s.status]}{s.eta && s.status !== "done" ? ` · ${s.eta}` : ""}
                      </span>
                    </summary>
                    <p className="mt-3 text-muted">{s.summary}</p>
                    {s.details && <p className="mt-2 whitespace-pre-line text-sm text-muted">{s.details}</p>}
                  </details>
                </li>
              ))}
            </ol>
          )}
        </Container>
      </Section>
    </>
  );
}
