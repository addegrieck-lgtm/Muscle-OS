import Link from "next/link";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatArticleDate, publishedArticles } from "@/lib/content/journal";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Journal — conseils d’éclairage",
  description:
    "Le journal LUMÉANCE : guides d’achat, conseils d’éclairage pièce par pièce, ambiances et entretien des luminaires.",
  path: "/journal",
});

export default function JournalPage() {
  const [first, ...rest] = publishedArticles();
  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title="L’art de la lumière, en pratique."
        intro="Conseils et repères pour choisir, installer et vivre avec de beaux luminaires."
      />
      <div className="container-luxe pb-32">
        {first && (
          <Link
            href={`/journal/${first.slug}`}
            className="group grid items-center gap-10 border-b border-brun/10 pb-20 md:grid-cols-12"
          >
            <div className="relative aspect-[4/3] overflow-hidden md:col-span-7">
              <LuminaireArt
                form={first.art}
                seed={first.slug}
                className="h-full w-full transition-transform duration-[1800ms] group-hover:scale-105"
                label=""
              />
            </div>
            <div className="md:col-span-5">
              <p className="t-eyebrow text-champagne">
                {first.category} · {first.readingMinutes} min
              </p>
              <p className="t-small mt-2 text-brun/50">{formatArticleDate(first.publishedAt)}</p>
              <h2 className="t-h2 mt-4">{first.title}</h2>
              <p className="mt-5 text-brun/75">{first.excerpt}</p>
            </div>
          </Link>
        )}
        <div className="mt-20 grid gap-x-10 gap-y-16 md:grid-cols-2">
          {rest.map((a, i) => (
            <Link
              key={a.slug}
              href={`/journal/${a.slug}`}
              data-reveal
              data-reveal-delay={String((i % 2) * 0.1)}
              className="group block"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <LuminaireArt
                  form={a.art}
                  seed={a.slug}
                  mood={i % 2 ? "jour" : "nuit"}
                  className="h-full w-full transition-transform duration-[1800ms] group-hover:scale-105"
                  label=""
                />
              </div>
              <p className="t-eyebrow mt-6 text-champagne">
                {a.category} · {a.readingMinutes} min · {formatArticleDate(a.publishedAt)}
              </p>
              <h2 className="t-h3 mt-3">{a.title}</h2>
              <p className="t-small mt-3 text-brun/70">{a.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
