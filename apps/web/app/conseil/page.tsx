import { Card, Container, EmptyState, Section, SectionHeader, formatDateTime } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { PollResults } from "@/components/world/PollPreview";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";
import { CouncilVote } from "./CouncilVote";

export const revalidate = 15;
export const metadata = pageMeta({
  title: "Le Conseil — la communauté décide",
  description: "Le Conseil de VÆLORIA : les joueurs votent sur les événements, les règles et l'avenir du serveur. Un vote par compte.",
  path: "/conseil",
});

export default async function CouncilPage() {
  const data = await orNull(api.polls());
  const open = data?.items.filter((p) => p.status === "open") ?? [];
  const closed = data?.items.filter((p) => p.status === "closed") ?? [];
  return (
    <>
      <PageHeader eyebrow="Conseil" title="La communauté décide" description="Événements, règles, nouveautés : les décisions importantes sont soumises au vote. Un vote par compte." crumbs={[{ name: "Conseil", path: "/conseil" }]} />
      <Section>
        <Container className="max-w-3xl space-y-12">
          {!data && <EmptyState title="Le Conseil est momentanément indisponible" />}
          {data && open.length === 0 && <EmptyState title="Aucun vote en cours">Les prochaines décisions seront soumises au Conseil.</EmptyState>}
          {open.map((p) => (
            <Card key={p.slug} className="space-y-4">
              <div>
                <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-accent">Vote en cours{p.closesAt ? ` · jusqu'au ${formatDateTime(p.closesAt)}` : ""}</p>
                <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-[0.04em]">{p.question}</h2>
                {p.description && <p className="mt-2 text-muted">{p.description}</p>}
              </div>
              <CouncilVote poll={p} />
            </Card>
          ))}
          {closed.length > 0 && (
            <div>
              <SectionHeader eyebrow="Historique" title="Décisions passées" />
              <div className="space-y-4">
                {closed.map((p) => (
                  <Card key={p.slug} className="space-y-3">
                    <h3 className="font-display text-lg font-bold uppercase tracking-[0.04em]">{p.question}</h3>
                    <PollResults poll={p} />
                    {p.outcome && <p className="border-t border-line pt-3 text-sm"><strong>Décision :</strong> {p.outcome}</p>}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
