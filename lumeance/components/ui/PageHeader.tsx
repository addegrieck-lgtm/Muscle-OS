import Link from "next/link";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/seo/jsonld";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <>
      <nav aria-label="Fil d’Ariane" className="t-small text-brun/50">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((it, i) => (
            <li key={it.path} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              {i === items.length - 1 ? (
                <span aria-current="page" className="text-brun/80">
                  {it.name}
                </span>
              ) : (
                <Link href={it.path} className="hover:text-brun">
                  {it.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(items)) }}
      />
    </>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
  crumbs,
}: {
  eyebrow?: string;
  title: string;
  intro?: React.ReactNode;
  crumbs?: { name: string; path: string }[];
}) {
  return (
    <header className="container-luxe pb-14 pt-36 md:pb-20 md:pt-48">
      {crumbs && <Breadcrumbs items={crumbs} />}
      {eyebrow && (
        <p data-reveal="fade" className="t-eyebrow mt-10 text-champagne">
          {eyebrow}
        </p>
      )}
      <h1 data-reveal className="t-h1 mt-5 max-w-5xl">
        {title}
      </h1>
      {intro && (
        <div data-reveal data-reveal-delay="0.15" className="t-lead mt-8 max-w-3xl text-brun/80">
          {intro}
        </div>
      )}
    </header>
  );
}
