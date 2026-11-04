import { Rise } from "@/components/admin/motion";
import { Card, Flash, PageTitle, flashFrom, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/admin";
import { priceRange } from "@/lib/catalog/price-range";
import { formatPrice } from "@/lib/money";
import { newUrls, priceGap } from "@/lib/seo/competitors";
import { getProducts } from "@/lib/services/catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addCompetitor,
  addPrice,
  deleteCompetitor,
  deletePrice,
  snapshotCompetitor,
} from "./actions";

export const metadata = { title: "Veille concurrentielle" };

interface Competitor {
  id: string;
  name: string;
  domain: string;
  notes: string | null;
}
interface Snap {
  competitor_id: string;
  taken_at: string;
  status: "ok" | "blocked" | "error";
  message: string | null;
  title: string | null;
  description: string | null;
  structured_types: string[];
  url_count: number | null;
  urls: string[];
}
interface PriceRow {
  id: string;
  competitor_id: string;
  product_label: string;
  our_slug: string | null;
  price: number;
  source_url: string;
  observed_on: string;
  notes: string | null;
}

const day = (d: string) => new Date(d).toLocaleDateString("fr-FR", { dateStyle: "medium" });

export default async function CompetitorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: cs, error }, { data: snaps }, { data: prices }, products] = await Promise.all([
    supabase.from("competitors").select("id, name, domain, notes").order("name"),
    supabase
      .from("competitor_snapshots")
      .select(
        "competitor_id, taken_at, status, message, title, description, structured_types, url_count, urls",
      )
      .order("taken_at", { ascending: false })
      .limit(200),
    supabase
      .from("competitor_prices")
      .select("id, competitor_id, product_label, our_slug, price, source_url, observed_on, notes")
      .order("observed_on", { ascending: false })
      .limit(300),
    getProducts(),
  ]);
  const competitors = (cs as Competitor[] | null) ?? [];
  const snapsBy = new Map<string, Snap[]>();
  for (const s of (snaps as Snap[] | null) ?? [])
    snapsBy.set(s.competitor_id, [...(snapsBy.get(s.competitor_id) ?? []), s]);
  const ours = new Map(products.filter((p) => !p.isDemo).map((p) => [p.slug, p]));
  const nameOf = new Map(competitors.map((c) => [c.id, c.name]));

  return (
    <>
      <PageTitle
        title="Veille concurrentielle"
        subtitle="Informations publiques et vérifiables uniquement : aucun trafic ni classement concurrent n’est estimé"
      />
      <Flash {...flashFrom(sp)} />
      {error && (
        <Flash error="La veille n’est pas encore installée : exécutez la migration 20261111000100_competitors.sql dans Supabase." />
      )}

      <Card title="Ajouter un concurrent">
        <form
          action={addCompetitor}
          className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end"
        >
          <input name="name" required placeholder="Nom" className={inputClass} />
          <input name="domain" required placeholder="site.fr" className={inputClass} />
          <input name="notes" placeholder="Note (positionnement, gamme…)" className={inputClass} />
          <SubmitButton>Ajouter</SubmitButton>
        </form>
        <p className="mt-3 text-xs text-brun/55">
          « Relever » lit la page d’accueil et le plan du site public, seulement si leur robots.txt
          l’autorise, au plus une fois par heure (robot identifié « LumeanceVeille »).
        </p>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {competitors.map((c, k) => {
          const [last, prev] = snapsBy.get(c.id) ?? [];
          const fresh =
            last?.status === "ok" && prev?.status === "ok" ? newUrls(prev.urls, last.urls) : [];
          return (
            <Rise key={c.id} delay={k * 80}>
              <Card
                title={c.name}
                actions={
                  <a
                    href={`https://${c.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline underline-offset-4"
                  >
                    {c.domain}
                  </a>
                }
              >
                {c.notes && <p className="mb-3 text-sm text-brun/65">{c.notes}</p>}
                {!last ? (
                  <p className="text-sm text-brun/55">Aucun relevé pour l’instant.</p>
                ) : last.status !== "ok" ? (
                  <p className="text-sm text-red-800">
                    {day(last.taken_at)} : {last.message}
                  </p>
                ) : (
                  <dl className="grid gap-2 text-sm">
                    <div>
                      <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-brun/55">
                        Titre de l’accueil
                      </dt>
                      <dd>{last.title ?? "Non renseigné"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-brun/55">
                        Description
                      </dt>
                      <dd className="text-brun/75">{last.description ?? "Non renseigné"}</dd>
                    </div>
                    <div className="flex flex-wrap gap-x-6">
                      <span>
                        <span className="text-brun/55">Pages déclarées : </span>
                        {last.url_count ?? "Non renseigné"}
                        {prev?.url_count != null &&
                          last.url_count != null &&
                          last.url_count !== prev.url_count && (
                            <span
                              className={
                                last.url_count > prev.url_count
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }
                            >
                              {" "}
                              ({last.url_count > prev.url_count ? "+" : ""}
                              {last.url_count - prev.url_count})
                            </span>
                          )}
                      </span>
                      <span>
                        <span className="text-brun/55">Données structurées : </span>
                        {last.structured_types.join(", ") || "aucune"}
                      </span>
                    </div>
                    <p className="text-xs text-brun/50">Relevé du {day(last.taken_at)}</p>
                    {fresh.length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer">
                          {fresh.length} nouvelle(s) page(s) depuis le relevé précédent
                        </summary>
                        <ul className="mt-2 space-y-1 break-all text-brun/70">
                          {fresh.slice(0, 30).map((u) => (
                            <li key={u}>
                              <a
                                href={u}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline"
                              >
                                {u}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </dl>
                )}
                <div className="mt-4 flex gap-2">
                  <form action={snapshotCompetitor}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton variant="secondary">Relever maintenant</SubmitButton>
                  </form>
                  <form action={deleteCompetitor}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton
                      variant="secondary"
                      confirm={`Retirer ${c.name} et ses relevés ?`}
                    >
                      Retirer
                    </SubmitButton>
                  </form>
                </div>
              </Card>
            </Rise>
          );
        })}
      </div>

      {competitors.length > 0 && (
        <Card title="Relevés de prix" className="mt-6">
          <form action={addPrice} className="grid gap-3 md:grid-cols-3">
            <select name="competitor_id" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Concurrent
              </option>
              {competitors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              name="product_label"
              required
              placeholder="Pièce relevée (nom, taille)"
              className={inputClass}
            />
            <input
              name="price"
              required
              inputMode="decimal"
              placeholder="Prix TTC (€)"
              className={inputClass}
            />
            <input
              name="source_url"
              required
              type="url"
              placeholder="https://… (page du prix)"
              className={inputClass}
            />
            <select name="our_slug" className={inputClass} defaultValue="">
              <option value="">Pièce LUMÉANCE comparable (facultatif)</option>
              {[...ours.values()].map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
            <input name="observed_on" type="date" className={inputClass} />
            <input
              name="notes"
              placeholder="Note (version, dimensions…)"
              className={`${inputClass} md:col-span-2`}
            />
            <SubmitButton>Enregistrer le relevé</SubmitButton>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-[0.68rem] uppercase tracking-[0.12em] text-brun/55">
                <tr>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Concurrent</th>
                  <th className="py-2 font-medium">Pièce</th>
                  <th className="py-2 text-right font-medium">Prix</th>
                  <th className="py-2 font-medium">Notre pièce (à partir de)</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brun/10">
                {((prices as PriceRow[] | null) ?? []).map((r) => {
                  const o = r.our_slug ? ours.get(r.our_slug) : undefined;
                  const from = o ? priceRange(o).min : null;
                  const gap = from ? priceGap(from, Number(r.price)) : null;
                  return (
                    <tr key={r.id}>
                      <td className="py-2 text-brun/65">{day(r.observed_on)}</td>
                      <td className="py-2">{nameOf.get(r.competitor_id)}</td>
                      <td className="py-2">
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          {r.product_label}
                        </a>
                        {r.notes && <span className="block text-xs text-brun/50">{r.notes}</span>}
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatPrice(Number(r.price))}</td>
                      <td className="py-2">
                        {o ? (
                          <>
                            {o.name} · {formatPrice(from!)}{" "}
                            <span className={gap! > 0 ? "text-red-700" : "text-emerald-700"}>
                              ({gap! > 0 ? "+" : ""}
                              {gap} %)
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <form action={deletePrice}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="text-xs underline underline-offset-4">
                            Supprimer
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-brun/50">
            L’écart compare le prix relevé au prix « à partir de » de notre pièce : à lire avec les
            versions et dimensions indiquées en note.
          </p>
        </Card>
      )}
    </>
  );
}
