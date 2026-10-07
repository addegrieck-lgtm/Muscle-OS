import Link from "next/link";
import { Container, EmptyState, NewsCard, Section, buttonClass } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 120;
export const metadata = pageMeta({
  title: "News & blog — actualités du serveur",
  description: "Actualités, patch notes, équilibrage PvP, saisons et guides du serveur Minecraft Faction VÆLORIA.",
  path: "/news",
});

const CATEGORIES = [
  ["", "Tout"], ["actualites", "Actualités"], ["serveur", "Serveur"], ["pvp", "PvP"], ["factions", "Factions"], ["minecraft", "Minecraft"], ["guides", "Guides"],
] as const;

export default async function NewsPage({ searchParams }: { searchParams: Promise<{ page?: string; category?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const category = CATEGORIES.some(([c]) => c === sp.category) ? sp.category : undefined;
  const news = await orNull(api.news(page, category || undefined));
  const pages = news ? Math.max(1, Math.ceil(news.total / news.pageSize)) : 1;
  const qs = (p: number) => `?${new URLSearchParams({ ...(category ? { category } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader eyebrow="News" title="Actualités" crumbs={[{ name: "News", path: "/news" }]} />
      <Section>
        <Container>
          <nav aria-label="Catégories" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
            {CATEGORIES.map(([id, label]) => (
              <Link key={id} href={id ? `/news?category=${id}` : "/news"} aria-current={(category ?? "") === id ? "page" : undefined} className={buttonClass((category ?? "") === id ? "primary" : "secondary", "sm", "shrink-0")}>
                {label}
              </Link>
            ))}
          </nav>
          {news?.items.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{news.items.map((a) => <NewsCard key={a.id} article={a} />)}</div>
          ) : (
            <EmptyState title="Aucun article pour le moment" />
          )}
          {pages > 1 && (
            <div className="mt-8 flex justify-between text-sm">
              {page > 1 ? <Link href={qs(page - 1)} className="text-accent">← Plus récents</Link> : <span />}
              {page < pages ? <Link href={qs(page + 1)} className="text-accent">Plus anciens →</Link> : <span />}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
