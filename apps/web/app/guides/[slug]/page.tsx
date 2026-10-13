import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND } from "@vaeloria/config";
import { Badge, ButtonLink, Card, Container, Section, formatDate } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { GUIDES, guideBySlug } from "@/content/guides";
import { Markdown } from "@/lib/markdown";
import { IS_OPEN, STAGE_CTA } from "@/lib/launch";
import { JsonLd, articleLd, pageMeta } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  return g ? pageMeta({ title: g.seoTitle, description: g.description, path: `/guides/${g.slug}`, type: "article" }) : {};
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const idx = GUIDES.indexOf(g);
  const next = GUIDES[idx + 1];
  return (
    <article>
      <JsonLd data={articleLd({ title: g.title, description: g.description, path: `/guides/${g.slug}`, publishedAt: g.updatedAt, updatedAt: g.updatedAt, author: BRAND.name })} />
      <PageHeader title={g.title} description={g.description} crumbs={[{ name: "Guides", path: "/guides" }, { name: g.title, path: `/guides/${g.slug}` }]}>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <Badge>{g.level}</Badge>
          <span>Mis à jour le <time dateTime={g.updatedAt}>{formatDate(g.updatedAt)}</time></span>
        </div>
      </PageHeader>
      <Section>
        <Container className="max-w-3xl">
          <Markdown source={g.body} />
          <aside aria-labelledby="a-lire" className="mt-10 border-t border-line pt-6">
            <h2 id="a-lire" className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-subtle">À lire aussi</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {g.related.map((r) => (
                <li key={r.href}><Link href={r.href} className="font-semibold text-accent hover:underline">{r.label} →</Link></li>
              ))}
            </ul>
          </aside>
          {!IS_OPEN && (
            <Card className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">Le serveur n&apos;est pas encore ouvert. Suis le développement et forme ta faction avant l&apos;ouverture.</p>
              <ButtonLink href={STAGE_CTA.primary.href} className="shrink-0" data-track="cta_click" data-track-id={`guide-${STAGE_CTA.primary.id}`}>{STAGE_CTA.primary.label}</ButtonLink>
            </Card>
          )}
          {next && (
            <p className="mt-10 border-t border-line pt-6 text-sm">
              Guide suivant : <Link href={`/guides/${next.slug}`} className="font-semibold text-accent">{next.title} →</Link>
            </p>
          )}
        </Container>
      </Section>
    </article>
  );
}
