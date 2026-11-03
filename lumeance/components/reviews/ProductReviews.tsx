import Link from "next/link";
import { monthYear, summarize, type PublicReview } from "@/lib/services/reviews";

function Stars({ value, size = "text-base" }: { value: number; size?: string }) {
  const full = Math.round(value);
  return (
    <span className={`${size} tracking-[0.1em] text-champagne`} aria-label={`${value} sur 5`}>
      {"★".repeat(full)}
      <span className="text-brun/20">{"★".repeat(5 - full)}</span>
    </span>
  );
}

/** Note moyenne compacte, sous le nom de la pièce (lien vers les avis). */
export function RatingBadge({ reviews }: { reviews: PublicReview[] }) {
  const s = summarize(reviews);
  if (!s.count) return null;
  return (
    <a href="#avis" className="t-small inline-flex items-center gap-2 text-brun/70 hover:text-brun">
      <Stars value={s.average} />
      <span>
        {s.average.toLocaleString("fr-FR")} · {s.count} avis vérifié{s.count > 1 ? "s" : ""}
      </span>
    </a>
  );
}

/** Avis clients vérifiés d'une pièce. Rien n'est affiché d'inventé : sans avis, une simple mention. */
export function ProductReviews({ reviews }: { reviews: PublicReview[] }) {
  const s = summarize(reviews);
  return (
    <section id="avis" className="container-luxe scroll-mt-28 pb-24" aria-labelledby="avis-title">
      <div className="grid gap-12 border-t border-brun/10 pt-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="t-eyebrow text-champagne">Avis clients</p>
          <h2 id="avis-title" className="t-h2 mt-4">
            {s.count ? `${s.average.toLocaleString("fr-FR")} / 5` : "Avis clients"}
          </h2>
          {s.count > 0 ? (
            <>
              <p className="mt-3">
                <Stars value={s.average} size="text-2xl" />
              </p>
              <p className="t-small mt-2 text-brun/60">
                {s.count} avis vérifié{s.count > 1 ? "s" : ""}
              </p>
              <ul className="mt-6 space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map((n) => (
                  <li key={n} className="flex items-center gap-3 text-sm">
                    <span className="w-8 shrink-0 whitespace-nowrap text-brun/60">{n} ★</span>
                    <span className="h-1.5 flex-1 bg-brun/10">
                      <span
                        className="block h-full bg-champagne"
                        style={{ width: `${(s.distribution[n] / s.count) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-brun/50">{s.distribution[n]}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-brun/70">
              Aucun avis pour le moment. Les avis sont déposés par nos clients après la livraison de
              leur commande.
            </p>
          )}
          <p className="t-small mt-6 text-brun/55">
            Avis vérifiés : seuls nos clients peuvent en déposer un, depuis un lien personnel reçu
            après l’expédition ; chaque avis est relu avant publication.{" "}
            <Link href="/avis-clients" className="underline underline-offset-4">
              En savoir plus
            </Link>
          </p>
        </div>
        {s.count > 0 && (
          <ul className="space-y-10 lg:col-span-7 lg:col-start-6">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-brun/10 pb-10">
                <Stars value={r.rating} />
                {r.title && <h3 className="mt-2 font-serif text-2xl">{r.title}</h3>}
                <p className="mt-3 whitespace-pre-line text-brun/85">{r.body}</p>
                {r.photos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {r.photos.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u}
                          alt={`Photo de ${r.authorName}`}
                          loading="lazy"
                          className="h-28 w-28 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
                <p className="t-small mt-4 text-brun/55">
                  {r.authorName} · <span className="text-champagne">Achat vérifié</span> · acheté en{" "}
                  {monthYear(r.purchasedAt)}
                  {r.publishedAt ? ` · publié en ${monthYear(r.publishedAt)}` : ""}
                </p>
                {r.adminReply && (
                  <div className="mt-4 border-l-2 border-champagne pl-4 text-sm text-brun/75">
                    <p className="t-eyebrow text-champagne">Réponse de LUMÉANCE</p>
                    <p className="mt-1 whitespace-pre-line">{r.adminReply}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
