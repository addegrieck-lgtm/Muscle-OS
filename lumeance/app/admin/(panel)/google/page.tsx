import Link from "next/link";
import { AreaChart, Donut, KpiCard, Rise } from "@/components/admin/motion";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { siteUrl } from "@/lib/env";
import { pathOf, type GscRow } from "@/lib/seo/gsc";
import { inspectUrl, searchConsoleReport } from "@/lib/services/google/search-console";

export const metadata = { title: "Google Search Console" };

const PERIODS = [7, 28, 90] as const;
const DEVICE: Record<string, string> = {
  MOBILE: "Mobile",
  DESKTOP: "Ordinateur",
  TABLET: "Tablette",
};
const VERDICT: Record<string, string> = {
  PASS: "Indexée",
  NEUTRAL: "Non indexée",
  FAIL: "Erreur",
  PARTIAL: "Partielle",
  VERDICT_UNSPECIFIED: "Inconnue de Google",
};
const INDEXING: Record<string, string> = {
  INDEXING_ALLOWED: "Oui",
  BLOCKED_BY_META_TAG: "Non : balise noindex",
  BLOCKED_BY_HTTP_HEADER: "Non : en-tête noindex",
  BLOCKED_BY_ROBOTS_TXT: "Non : robots.txt",
};
const nf = (n: number) => n.toLocaleString("fr-FR");
const pct = (x: number) => `${(x * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
const pos = (x: number) => x.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const day = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : "—";

function Rows({ rows, kind }: { rows: GscRow[]; kind: "query" | "page" }) {
  if (!rows.length)
    return (
      <p className="text-sm text-brun/55">Aucune donnée sur la période (le site est récent).</p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="text-left text-[0.68rem] uppercase tracking-[0.12em] text-brun/50">
          <tr>
            <th className="py-2 font-normal">{kind === "query" ? "Recherche" : "Page"}</th>
            <th className="py-2 text-right font-normal">Clics</th>
            <th className="py-2 text-right font-normal">Impressions</th>
            <th className="py-2 text-right font-normal">Taux de clic</th>
            <th className="py-2 text-right font-normal">Position</th>
            {kind === "page" && <th className="py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-brun/10">
          {rows.slice(0, 25).map((r) => {
            const key = r.keys[0]!;
            const path = pathOf(key);
            return (
              <tr key={key}>
                <td className="max-w-[18rem] truncate py-2 pr-3">
                  {kind === "page" ? (
                    <a href={key} target="_blank" rel="noreferrer" className="hover:underline">
                      {path}
                    </a>
                  ) : (
                    key
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">{nf(r.clicks)}</td>
                <td className="py-2 text-right tabular-nums">{nf(r.impressions)}</td>
                <td className="py-2 text-right tabular-nums">{pct(r.ctr)}</td>
                <td className="py-2 text-right tabular-nums">{pos(r.position)}</td>
                {kind === "page" && (
                  <td className="py-2 pl-3 text-right">
                    <Link
                      href={`/admin/google?inspecter=${encodeURIComponent(path)}#inspection`}
                      className="text-xs underline underline-offset-4"
                    >
                      Indexation
                    </Link>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Setup({ email, sites }: { email?: string; sites?: string[] }) {
  if (email)
    return (
      <Card title="Dernière étape : donner l’accès">
        <p className="text-sm text-brun/75">
          La clé est bien installée, mais ce compte n’a pas encore accès à votre propriété Search
          Console. Dans Search Console → Paramètres → Utilisateurs et autorisations → Ajouter un
          utilisateur, collez cette adresse avec l’autorisation « Restreinte » :
        </p>
        <p className="mt-3 select-all break-all border border-brun/15 bg-white px-3 py-2 font-mono text-sm">
          {email}
        </p>
        {sites && sites.length > 0 && (
          <p className="mt-3 text-xs text-brun/55">Propriétés visibles : {sites.join(", ")}</p>
        )}
      </Card>
    );
  return (
    <Card title="Connecter Google Search Console">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-brun/80">
        <li>
          Sur console.cloud.google.com, créer un projet (ex. « Luméance SEO ») puis activer l’API «
          Google Search Console API ».
        </li>
        <li>
          IAM et administration → Comptes de service → Créer un compte de service (aucun rôle
          nécessaire) → onglet Clés → Ajouter une clé → JSON : un fichier est téléchargé.
        </li>
        <li>
          Cloudflare → Workers → lumeance → Paramètres → Variables et secrets → ajouter un secret{" "}
          <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> et y coller tout le contenu du fichier.
        </li>
        <li>
          Search Console → Paramètres → Utilisateurs et autorisations → ajouter l’adresse du compte
          de service (…@….iam.gserviceaccount.com) en « Restreinte ».
        </li>
      </ol>
      <p className="mt-4 text-xs text-brun/55">
        La clé reste sur le serveur et ne donne qu’un accès en lecture. Aucune donnée n’est estimée
        : tout vient de Google.
      </p>
    </Card>
  );
}

export default async function GooglePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const days = PERIODS.find((d) => String(d) === sp.jours) ?? 28;
  const target =
    sp.inspecter?.startsWith("/") && !sp.inspecter.startsWith("//") ? sp.inspecter : null;
  const [r, inspection] = await Promise.all([
    searchConsoleReport(days),
    target ? inspectUrl(`${siteUrl}${target}`) : Promise.resolve(null),
  ]);

  const periodLinks = (
    <div className="flex gap-1">
      {PERIODS.map((d) => (
        <Link
          key={d}
          href={`/admin/google?jours=${d}`}
          className={`px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${d === days ? "bg-brun text-ivoire" : "border border-brun/15"}`}
        >
          {d} jours
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <PageTitle
        title="Google Search Console"
        subtitle="Ce que Google voit du site : recherches, clics, positions et indexation"
        actions={r.status === "ok" ? periodLinks : undefined}
      />

      {r.status === "unconfigured" && <Setup />}
      {r.status === "no-access" && <Setup email={r.email} sites={r.sites} />}
      {r.status === "error" && (
        <Card title="Google n’a pas répondu">
          <p className="text-sm text-red-800">{r.message}</p>
          {r.email && <p className="mt-2 text-xs text-brun/55">Compte de service : {r.email}</p>}
        </Card>
      )}

      {r.status === "ok" && (
        <>
          <p className="-mt-4 mb-6 text-xs text-brun/55">
            Propriété {r.property} · du {day(r.range.current.start)} au {day(r.range.current.end)}{" "}
            (Google publie ses données avec 2 à 3 jours de retard)
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Clics" value={r.current.clicks} previous={r.previous.clicks} />
            <KpiCard
              label="Impressions"
              value={r.current.impressions}
              previous={r.previous.impressions}
              delay={120}
            />
            {r.current.ctr !== null ? (
              <KpiCard
                label="Taux de clic"
                value={r.current.ctr * 100}
                previous={r.previous.ctr !== null ? r.previous.ctr * 100 : undefined}
                format="decimal"
                delay={240}
              />
            ) : (
              <Card title="Taux de clic">
                <p className="text-sm text-brun/55">Non renseigné</p>
              </Card>
            )}
            {r.current.position !== null ? (
              <KpiCard
                label="Position moyenne"
                value={r.current.position}
                previous={r.previous.position ?? undefined}
                format="decimal"
                lowerIsBetter
                delay={360}
              />
            ) : (
              <Card title="Position moyenne">
                <p className="text-sm text-brun/55">Non renseigné</p>
              </Card>
            )}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
            <Rise>
              <Card title="Clics (trait plein) et impressions, jour par jour">
                <AreaChart
                  points={r.series.map((p) => ({
                    label: day(p.date),
                    value: p.impressions,
                    secondary: p.clicks,
                  }))}
                />
              </Card>
            </Rise>
            <Rise delay={120}>
              <Card title="Appareils (clics)">
                <Donut
                  items={r.devices.map((d) => ({
                    label: DEVICE[d.keys[0]!] ?? d.keys[0]!,
                    value: d.clicks,
                  }))}
                />
              </Card>
            </Rise>
          </div>

          <Rise className="mt-6">
            <Card title="Pistes de travail (tirées des données Google)">
              {r.opportunities.length === 0 ? (
                <p className="text-sm text-brun/55">
                  Pas encore assez de données : les pistes apparaissent dès qu’une recherche dépasse
                  10 impressions.
                </p>
              ) : (
                <ul className="divide-y divide-brun/10 text-sm">
                  {r.opportunities.map((o) => (
                    <li key={`${o.kind}-${o.query}-${o.page}`} className="py-3">
                      <p>
                        <span
                          className={`mr-2 inline-block px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.1em] ${o.kind === "page2" ? "bg-champagne/25" : "bg-brun/10"}`}
                        >
                          {o.kind === "page2" ? "Page 2" : "Peu cliquée"}
                        </span>
                        <span className="font-medium">« {o.query} »</span>
                        <span className="text-brun/55">
                          {" "}
                          → {pathOf(o.page)} · position {pos(o.position)} · {nf(o.impressions)}{" "}
                          impressions · {pct(o.ctr)}
                        </span>
                      </p>
                      <p className="mt-1 text-brun/70">{o.advice}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Rise>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Rise>
              <Card title="Recherches qui affichent le site">
                <Rows rows={r.queries} kind="query" />
              </Card>
            </Rise>
            <Rise delay={120}>
              <Card title="Pages les plus vues dans Google">
                <Rows rows={r.pages} kind="page" />
              </Card>
            </Rise>
          </div>

          <Rise className="mt-6">
            <Card title="Plans du site envoyés à Google">
              {r.sitemaps.length === 0 ? (
                <p className="text-sm text-brun/55">
                  Aucun plan du site envoyé : dans Search Console → Sitemaps, ajouter{" "}
                  <code>sitemap.xml</code>.
                </p>
              ) : (
                <ul className="divide-y divide-brun/10 text-sm">
                  {r.sitemaps.map((s) => (
                    <li key={s.path} className="flex flex-wrap gap-x-6 gap-y-1 py-2">
                      <span className="font-medium">{pathOf(s.path)}</span>
                      <span className="text-brun/60">Envoyé le {day(s.lastSubmitted)}</span>
                      <span className="text-brun/60">Lu par Google le {day(s.lastDownloaded)}</span>
                      <span className="text-brun/60">
                        {s.contents?.map((c) => `${c.submitted ?? "?"} adresses`).join(", ")}
                      </span>
                      {(Number(s.errors) > 0 || Number(s.warnings) > 0) && (
                        <span className="text-red-800">
                          {s.errors} erreur(s), {s.warnings} avertissement(s)
                        </span>
                      )}
                      {s.isPending && <span className="text-brun/60">En cours de traitement</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Rise>
        </>
      )}

      {r.status !== "unconfigured" && (
        <Rise className="mt-6">
          <div id="inspection">
            <Card title="Vérifier l’indexation d’une page">
              <form action="/admin/google" className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="jours" value={days} />
                <label className="flex-1 text-sm">
                  <span className="block text-[0.68rem] uppercase tracking-[0.12em] text-brun/55">
                    Adresse de la page (ex. /produit/organza)
                  </span>
                  <input
                    name="inspecter"
                    defaultValue={target ?? ""}
                    placeholder="/produit/organza"
                    className="mt-1 w-full border border-brun/20 bg-white px-3 py-2"
                  />
                </label>
                <button className="bg-brun px-4 py-2 text-xs uppercase tracking-[0.14em] text-ivoire">
                  Vérifier
                </button>
              </form>
              {inspection &&
                ("error" in inspection ? (
                  <p className="mt-4 text-sm text-red-800">{inspection.error}</p>
                ) : (
                  <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {(
                      [
                        [
                          "Verdict",
                          inspection.verdict && (VERDICT[inspection.verdict] ?? inspection.verdict),
                        ],
                        ["État", inspection.coverageState],
                        [
                          "Indexation autorisée",
                          inspection.indexingState &&
                            (INDEXING[inspection.indexingState] ?? inspection.indexingState),
                        ],
                        ["Dernière visite de Google", day(inspection.lastCrawlTime)],
                        ["Canonique choisie par Google", inspection.googleCanonical],
                        ["Canonique déclarée", inspection.userCanonical],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-brun/55">
                          {k}
                        </dt>
                        <dd className="break-all">{v || "Non renseigné"}</dd>
                      </div>
                    ))}
                  </dl>
                ))}
            </Card>
          </div>
        </Rise>
      )}
    </>
  );
}
