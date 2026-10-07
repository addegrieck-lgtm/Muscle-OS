import Link from "next/link";
import { notFound } from "next/navigation";
import { LEADERBOARD_CATEGORIES, type LeaderboardCategory } from "@vaeloria/config";
import { Container, LeaderboardTable, Section, buttonClass } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { PREVIEW } from "@/lib/preview";
import { pageMeta } from "@/lib/seo";

export const revalidate = 60;
const PLAYER_BOARDS = new Set(["kills", "activity"]);
const find = (id: string) => LEADERBOARD_CATEGORIES.find((c) => c.id === id);

export function generateStaticParams() {
  return LEADERBOARD_CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const c = find((await params).category);
  if (!c) return {};
  return pageMeta({ title: `Classement ${c.label}`, description: `Classement complet « ${c.label} » de la saison en cours sur VÆLORIA.`, path: `/leaderboards/${c.id}` });
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ category: string }>; searchParams: Promise<{ page?: string }> }) {
  const { category } = await params;
  const c = find(category);
  if (!c) notFound();
  const page = PREVIEW ? 1 : Math.max(1, Number((await searchParams).page) || 1);
  const board = await orNull(api.leaderboard(c.id as LeaderboardCategory, page));
  const pages = board ? Math.max(1, Math.ceil(board.total / 50)) : 1;
  return (
    <>
      <PageHeader eyebrow="Classement" title={c.label} crumbs={[{ name: "Classements", path: "/classements" }, { name: c.label, path: `/leaderboards/${c.id}` }]} />
      <Section>
        <Container className="max-w-3xl">
          <nav aria-label="Catégories" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
            {LEADERBOARD_CATEGORIES.map((x) => (
              <Link key={x.id} href={`/leaderboards/${x.id}`} aria-current={x.id === c.id ? "page" : undefined} className={buttonClass(x.id === c.id ? "primary" : "secondary", "sm", "shrink-0")}>
                {x.label}
              </Link>
            ))}
          </nav>
          <LeaderboardTable board={board} unit={c.unit} hrefFor={(_i, n) => (PLAYER_BOARDS.has(c.id) ? `/joueur/${encodeURIComponent(n)}` : `/faction/${encodeURIComponent(n)}`)} />
          {pages > 1 && (
            <div className="mt-6 flex justify-between text-sm">
              {page > 1 ? <Link href={`?page=${page - 1}`} className="text-accent">← Précédent</Link> : <span />}
              <span className="text-muted">Page {page} / {pages}</span>
              {page < pages ? <Link href={`?page=${page + 1}`} className="text-accent">Suivant →</Link> : <span />}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
