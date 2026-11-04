import Link from "next/link";
import { Arrow } from "@/components/ui/Button";
import type { Article } from "@/lib/content/journal";

/**
 * Liens contextuels de fin de page : pièces de la maison et guides du journal liés à la page.
 * N'affiche rien sans lien à proposer.
 */
export function FurtherReading({
  title = "Pour aller plus loin",
  rooms = [],
  articles = [],
}: {
  title?: string;
  rooms?: { id: string; label: string }[];
  articles?: Pick<Article, "slug" | "title" | "category" | "readingMinutes">[];
}) {
  if (!rooms.length && !articles.length) return null;
  return (
    <section className="border-t border-brun/10 bg-ivoire py-20" aria-labelledby="further-title">
      <div className="container-luxe grid gap-10 md:grid-cols-12">
        <h2 id="further-title" className="t-h3 md:col-span-4">
          {title}
        </h2>
        <div className="space-y-10 md:col-span-7 md:col-start-6">
          {rooms.length > 0 && (
            <div>
              <p className="t-eyebrow text-champagne">Idéal pour</p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {rooms.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/luminaires/${r.id}`}
                      className="inline-block border border-brun/20 px-4 py-2 text-sm transition-colors hover:border-champagne hover:text-champagne"
                    >
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {articles.length > 0 && (
            <div>
              <p className="t-eyebrow text-champagne">Dans le journal</p>
              <ul className="mt-4 divide-y divide-brun/10 border-y border-brun/10">
                {articles.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/journal/${a.slug}`}
                      className="group flex items-center justify-between gap-6 py-4"
                    >
                      <span>
                        <span className="block font-serif text-xl">{a.title}</span>
                        <span className="t-small text-brun/55">
                          {a.category} · {a.readingMinutes} min
                        </span>
                      </span>
                      <Arrow />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
