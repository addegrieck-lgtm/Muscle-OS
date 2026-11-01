import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import { Arrow } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { ProductCard } from "@/components/catalog/ProductCard";
import { formatArticleDate, getArticle } from "@/lib/content/journal";
import { getProducts } from "@/lib/services/catalog";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/seo/metadata";
import { jsonLdScript } from "@/lib/seo/jsonld";

type Props = { params: Promise<{ slug: string }> };

// Rendu à chaque visite : un article programmé n'existe (page, sitemap) qu'à partir de sa date.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = getArticle((await params).slug);
  return a
    ? pageMetadata({ title: a.title, description: a.description, path: `/journal/${a.slug}` })
    : {};
}

export default async function ArticlePage({ params }: Props) {
  const a = getArticle((await params).slug);
  if (!a) notFound();
  // Pièces évoquées : uniquement celles publiées au catalogue, dans l'ordre de l'article.
  const catalog = a.productSlugs?.length ? await getProducts() : [];
  const products = (a.productSlugs ?? [])
    .map((slug) => catalog.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 3);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    datePublished: a.publishedAt,
    dateModified: a.publishedAt,
    articleSection: a.category,
    inLanguage: "fr-FR",
    author: { "@type": "Organization", name: SITE_NAME },
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
        eyebrow={`${a.category} · ${a.readingMinutes} min de lecture · ${formatArticleDate(a.publishedAt)}`}
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
          {a.faq?.length ? (
            <section>
              <h2>Questions fréquentes</h2>
              {a.faq.map((f) => (
                <div key={f.q} className="mt-6">
                  <h3>{f.q}</h3>
                  <p className="mt-2">{f.a}</p>
                </div>
              ))}
            </section>
          ) : null}
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
      {products.length > 0 && (
        <section className="bg-sable/20 py-20 md:py-28">
          <div className="container-luxe">
            <h2 className="t-h2">Les pièces évoquées</h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
    </article>
  );
}
