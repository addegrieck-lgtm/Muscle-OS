import Link from "next/link";
import { Arrow, Eyebrow } from "@/components/ui/Button";
import { publishedArticles } from "@/lib/content/journal";

/** Accueil : les trois derniers articles du journal. */
export function JournalTeaser() {
  const list = publishedArticles().slice(0, 3);
  if (!list.length) return null;
  return (
    <section className="bg-ivoire py-24 md:py-36" aria-labelledby="journal-title">
      <div className="container-luxe">
        <Eyebrow>Le journal</Eyebrow>
        <h2 id="journal-title" data-reveal className="t-h2 mt-6">
          Conseils et inspirations.
        </h2>
        <ul className="mt-14 grid gap-10 md:grid-cols-3">
          {list.map((a, k) => (
            <li
              key={a.slug}
              data-reveal
              data-reveal-delay={String(k * 0.1)}
              className="border-t border-brun/15 pt-6"
            >
              <p className="t-eyebrow text-champagne">{a.category}</p>
              <h3 className="mt-3 font-serif text-2xl leading-tight">
                <Link href={`/journal/${a.slug}`} className="hover:text-champagne">
                  {a.title}
                </Link>
              </h3>
              <p className="t-small mt-3 text-brun/70">{a.excerpt}</p>
              <Link
                href={`/journal/${a.slug}`}
                className="t-eyebrow group mt-5 inline-flex items-center gap-3"
              >
                Lire ({a.readingMinutes} min) <Arrow />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
