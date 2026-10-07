import { notFound } from "next/navigation";
import { Badge, Container, Section, formatDate } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { Markdown } from "@/lib/markdown";
import { JsonLd, articleLd, pageMeta } from "@/lib/seo";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = await orNull(api.article((await params).slug));
  if (!a) return {};
  return pageMeta({ title: a.title, description: a.excerpt, path: `/news/${a.slug}`, type: "article" });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = await orNull(api.article((await params).slug));
  if (!a) notFound();
  return (
    <article>
      <JsonLd data={articleLd({ title: a.title, description: a.excerpt, path: `/news/${a.slug}`, publishedAt: a.publishedAt, updatedAt: a.updatedAt, author: a.author })} />
      <PageHeader title={a.title} description={a.excerpt} crumbs={[{ name: "News", path: "/news" }, { name: a.title, path: `/news/${a.slug}` }]}>
        <div className="flex items-center gap-3 text-sm text-muted">
          <Badge>{a.category}</Badge>
          <time dateTime={a.publishedAt}>{formatDate(a.publishedAt)}</time>
          <span>· {a.author}</span>
        </div>
      </PageHeader>
      <Section>
        <Container className="max-w-3xl">
          <Markdown source={a.body} />
        </Container>
      </Section>
    </article>
  );
}
