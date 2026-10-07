import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { GUIDES, guideBySlug } from "@/content/guides";
import { Markdown } from "@/lib/markdown";
import { pageMeta } from "@/lib/seo";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  return g ? pageMeta({ title: g.title, description: g.description, path: `/guides/${g.slug}`, type: "article" }) : {};
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const idx = GUIDES.indexOf(g);
  const next = GUIDES[idx + 1];
  return (
    <article>
      <PageHeader title={g.title} description={g.description} crumbs={[{ name: "Guides", path: "/guides" }, { name: g.title, path: `/guides/${g.slug}` }]}>
        <Badge>{g.level}</Badge>
      </PageHeader>
      <Section>
        <Container className="max-w-3xl">
          <Markdown source={g.body} />
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
