import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import { Arrow } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { ARTICLES, getArticle } from "@/lib/content/journal";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { jsonLdScript } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = getArticle((await params).slug);
  return a
    ? pageMetadata({ title: a.title, description: a.description, path: `/journal/${a.slug}` })
    : {};
}

export default async function ArticlePage({ params }: Props) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: absoluteUrl(`/journal/${a.slug}`),
  };
  return (
    <article>
      <PageHeader
        crumbs={[
          { name: "Accueil", path: "/" },
          { name: "Journal", path: "/journal" },
          { name: a.title, path: `/journal/${a.slug}` },
        ]}
        eyebrow={`Guide · ${a.readingMinutes} min de lecture`}
        title={a.title}
        intro={a.excerpt}
      />
      <div className="container-luxe">
        <div data-reveal="mask" className="relative aspect-[21/9] overflow-hidden">
          <LuminaireArt form={a.art} seed={a.slug} className="h-full w-full" label="" />
        </div>
      </div>
      <div className="container-luxe py-20 md:py-28">
        <Prose className="mx-auto">
          {a.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              {s.paragraphs.map((p) => (
                <p key={p} className="mt-5">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <p className="t-small pt-8 text-brun/55">
            Ces repères sont donnés à titre indicatif ; pour toute installation électrique, faites
            appel à un professionnel qualifié.
          </p>
        </Prose>
        <div className="mx-auto mt-16 flex max-w-3xl flex-col gap-4 border-t border-brun/10 pt-10 sm:flex-row sm:gap-10">
          {a.related.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="t-eyebrow group inline-flex items-center gap-3 text-champagne"
            >
              {r.label} <Arrow />
            </Link>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
    </article>
  );
}
