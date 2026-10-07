import Link from "next/link";
import { redirect } from "next/navigation";
import type { PointsEntry, RankProgress } from "@vaeloria/types";
import { Container, EmptyState, Section, cn, formatDate } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";
import { authedApi, getMe } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({ title: "Historique des points", description: "Historique de tes points boutique.", path: "/compte/points", noindex: true });

const REASON: Record<PointsEntry["reason"], string> = { purchase: "Achat", refund: "Remboursement", promotion_bonus: "Bonus", admin_adjustment: "Ajustement" };

export default async function PointsPage({ searchParams }: { searchParams: Promise<{ joueur?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/login?next=%2Fcompte%2Fpoints");
  const wanted = (await searchParams).joueur;
  const account = me.minecraft.find((m) => m.uuid === wanted) ?? me.minecraft[0];
  if (!account) redirect("/compte");
  const { progress, history } = await authedApi<{ progress: RankProgress; history: PointsEntry[] }>(`/api/v1/me/points/${account.uuid}`);
  return (
    <>
      <PageHeader title="Historique des points" eyebrow={account.username} crumbs={[{ name: "Mon compte", path: "/compte" }, { name: "Points", path: "/compte/points" }]} />
      <Section className="py-8 sm:py-12">
        <Container className="max-w-2xl">
          {me.minecraft.length > 1 && (
            <nav className="mb-6 flex flex-wrap gap-2" aria-label="Comptes Minecraft">
              {me.minecraft.map((m) => (
                <Link key={m.uuid} href={`?joueur=${m.uuid}`} aria-current={m.uuid === account.uuid ? "page" : undefined} className={cn("rounded-md border px-3 py-1.5 text-sm", m.uuid === account.uuid ? "border-ruby text-fg" : "border-line text-muted")}>{m.username}</Link>
              ))}
            </nav>
          )}
          {history.length === 0 ? (
            <EmptyState title="Aucun point pour l'instant">Chaque euro dépensé dans la boutique rapporte un point.</EmptyState>
          ) : (
            <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{h.label}</p>
                    <p className="text-xs text-subtle">{REASON[h.reason]} · {formatDate(h.createdAt)}{h.orderPublicId ? ` · ${h.orderPublicId}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-display text-lg font-bold tabular-nums", h.delta > 0 ? "text-accent" : "text-muted")}>{h.delta > 0 ? "+" : ""}{h.delta}</p>
                    <p className="text-xs tabular-nums text-subtle">solde {h.balanceAfter}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 flex items-center justify-between border-t border-line pt-4 font-display text-xl font-bold uppercase tracking-[0.05em]">
            Total <span className="tabular-nums">{progress.points} points</span>
          </p>
        </Container>
      </Section>
    </>
  );
}
