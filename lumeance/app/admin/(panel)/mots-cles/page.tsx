import Link from "next/link";
import { KpiCard } from "@/components/admin/motion";
import { Card, Flash, PageTitle, flashFrom, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/admin";
import {
  cannibalized,
  discovered,
  INTENTS,
  keywordIdeas,
  pagesByKeyword,
  positionBand,
  positionGain,
  statsByKeyword,
  statsOf,
} from "@/lib/seo/keywords";
import { sitePages } from "@/lib/seo/site-pages";
import { getCategories, getProducts } from "@/lib/services/catalog";
import { listPublishedArticles } from "@/lib/services/journal";
import { keywordData } from "@/lib/services/keywords";
import { addKeyword, deleteKeyword, updateKeyword } from "./actions";

export const metadata = { title: "Mots-clés" };

const PERIODS = [28, 90] as const;
const BAND: Record<ReturnType<typeof positionBand>, string> = {
  top3: "bg-emerald-700 text-ivoire",
  top10: "bg-emerald-600/80 text-ivoire",
  page2: "bg-champagne text-noir",
  loin: "bg-brun/20",
  absent: "bg-brun/5 text-brun/50",
};
const nf = (n: number) => n.toLocaleString("fr-FR");
const pos = (p: number | null) =>
  p === null ? "—" : p.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const pct = (x: number | null) =>
  x === null ? "—" : `${(x * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

function AddForm({
  keyword = "",
  target = "",
  intent = "commerciale",
  paths,
  compact = false,
}: {
  keyword?: string;
  target?: string;
  intent?: string;
  paths: { path: string; name: string }[];
  compact?: boolean;
}) {
  return (
    <form
      action={addKeyword}
      className={compact ? "inline" : "grid gap-3 md:grid-cols-[2fr_2fr_1fr_1fr_auto] md:items-end"}
    >
      {compact ? (
        <>
          <input type="hidden" name="keyword" value={keyword} />
          <input type="hidden" name="target_path" value={target} />
          <input type="hidden" name="intent" value={intent} />
          <input type="hidden" name="priority" value="2" />
          <button className="text-xs underline underline-offset-4">Suivre</button>
        </>
      ) : (
        <>
          <input name="keyword" required placeholder="ex. lustre escalier" className={inputClass} />
          <select name="target_path" className={inputClass} defaultValue="">
            <option value="">Page cible (facultatif)</option>
            {paths.map((p) => (
              <option key={p.path} value={p.path}>
                {p.name} — {p.path}
              </option>
            ))}
          </select>
          <select name="intent" className={inputClass} defaultValue="commerciale">
            {INTENTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <select name="priority" className={inputClass} defaultValue="2">
            <option value="1">Priorité haute</option>
            <option value="2">Priorité moyenne</option>
            <option value="3">Priorité basse</option>
          </select>
          <SubmitButton>Suivre</SubmitButton>
        </>
      )}
    </form>
  );
}

export default async function KeywordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const days = PERIODS.find((d) => String(d) === sp.jours) ?? 28;
  const [{ tracked, gsc }, products, categories, articles] = await Promise.all([
    keywordData(days),
    getProducts(),
    getCategories(),
    listPublishedArticles(),
  ]);
  const paths = sitePages(products, categories, articles).map((p) => ({
    path: p.path,
    name: p.name,
  }));
  const pathSet = new Set(paths.map((p) => p.path));
  const list = tracked ?? [];
  const now = statsByKeyword(gsc.ok ? gsc.current : []);
  const before = statsByKeyword(gsc.ok ? gsc.previous : []);
  const pages = pagesByKeyword(gsc.ok ? gsc.pairs : []);
  const rows = list.map((k) => {
    const s = statsOf(now, k.keyword);
    const p = statsOf(before, k.keyword);
    const kp = pages.get(k.keyword) ?? [];
    return {
      k,
      s,
      gain: positionGain(s.position, p.position),
      top: kp[0]?.path ?? null,
      canni: cannibalized(kp),
    };
  });
  const ideas = keywordIdeas(
    list.map((k) => k.keyword),
    pathSet,
  );
  const found = gsc.ok
    ? discovered(
        gsc.allQueries,
        list.map((k) => k.keyword),
      )
    : [];
  const count = (b: ReturnType<typeof positionBand>[]) =>
    rows.filter((r) => b.includes(positionBand(r.s.position))).length;

  return (
    <>
      <PageTitle
        title="Mots-clés"
        subtitle="Expressions suivies et leurs positions réelles dans Google (Search Console)"
        actions={
          <div className="flex gap-1">
            {PERIODS.map((d) => (
              <Link
                key={d}
                href={`/admin/mots-cles?jours=${d}`}
                className={`px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${d === days ? "bg-brun text-ivoire" : "border border-brun/15"}`}
              >
                {d} jours
              </Link>
            ))}
          </div>
        }
      />
      <Flash {...flashFrom(sp)} />
      {tracked === null && (
        <Flash error="Le suivi n’est pas encore installé : exécutez la migration 20261110000100_seo_keywords.sql dans Supabase." />
      )}
      {!gsc.ok && (
        <Flash
          error={
            gsc.status === "unconfigured"
              ? "Search Console n’est pas connecté : les chiffres s’afficheront « Non renseigné » (voir la page Google Search Console)."
              : `Search Console : ${gsc.message ?? gsc.status}`
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Mots-clés suivis" value={list.length} />
        <KpiCard label="Dans le top 10" value={count(["top3", "top10"])} delay={120} />
        <KpiCard label="En page 2 (11 à 20)" value={count(["page2"])} delay={240} />
        <KpiCard label="Pas encore vus dans Google" value={count(["absent"])} delay={360} />
      </div>

      <Card title="Suivre une expression" className="mt-6">
        <AddForm paths={paths} />
        <p className="mt-3 text-xs text-brun/55">
          Volume de recherche et difficulté : <strong>Non renseigné</strong>. Aucune source gratuite
          fiable ne les fournit ; seules vos données réelles (impressions, clics, position) sont
          affichées.
        </p>
      </Card>

      <div className="mt-6 overflow-x-auto border border-brun/10 bg-white/60">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-brun/10 text-[0.68rem] uppercase tracking-[0.12em] text-brun/55">
            <tr>
              <th className="px-3 py-3 font-medium">Expression</th>
              <th className="px-3 py-3 font-medium">Position</th>
              <th className="px-3 py-3 text-right font-medium">Impressions</th>
              <th className="px-3 py-3 text-right font-medium">Clics</th>
              <th className="px-3 py-3 text-right font-medium">Taux de clic</th>
              <th className="px-3 py-3 font-medium">Volume</th>
              <th className="px-3 py-3 font-medium">Page cible / page qui ressort</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-brun/5">
            {rows.map(({ k, s, gain, top, canni }) => (
              <tr key={k.id} className="align-top">
                <td className="px-3 py-3">
                  <span className="font-medium">{k.keyword}</span>
                  <span className="block text-xs text-brun/50">
                    {k.intent} · priorité{" "}
                    {k.priority === 1 ? "haute" : k.priority === 2 ? "moyenne" : "basse"}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block min-w-12 px-2 py-0.5 text-center text-xs ${BAND[positionBand(s.position)]}`}
                  >
                    {s.position === null ? "Non renseigné" : pos(s.position)}
                  </span>
                  {gain !== null && gain !== 0 && (
                    <span
                      className={`ml-2 text-xs ${gain > 0 ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {gain > 0 ? "▲" : "▼"} {Math.abs(gain)}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{nf(s.impressions)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{nf(s.clicks)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{pct(s.ctr)}</td>
                <td className="px-3 py-3 text-xs text-brun/50">Non renseigné</td>
                <td className="px-3 py-3 text-xs">
                  <form action={updateKeyword} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={k.id} />
                    <input type="hidden" name="intent" value={k.intent} />
                    <input type="hidden" name="priority" value={k.priority} />
                    <select
                      name="target_path"
                      defaultValue={k.target_path ?? ""}
                      className="max-w-[14rem] border border-brun/15 bg-white px-2 py-1"
                    >
                      <option value="">— aucune —</option>
                      {paths.map((p) => (
                        <option key={p.path} value={p.path}>
                          {p.path}
                        </option>
                      ))}
                    </select>
                    <button className="underline underline-offset-4">OK</button>
                  </form>
                  {top && (
                    <p
                      className={`mt-1 ${k.target_path && top !== k.target_path ? "text-red-800" : "text-brun/55"}`}
                    >
                      Google montre : {top}
                      {k.target_path && top !== k.target_path && " (différente de la cible)"}
                    </p>
                  )}
                  {canni.length > 0 && (
                    <p className="mt-1 text-red-800">
                      {canni.length} pages se partagent cette recherche :{" "}
                      {canni.map((c) => c.path).join(", ")}
                    </p>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <form action={deleteKeyword}>
                    <input type="hidden" name="id" value={k.id} />
                    <SubmitButton variant="secondary" confirm={`Ne plus suivre « ${k.keyword} » ?`}>
                      Retirer
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="px-4 py-10 text-center text-sm text-brun/50">
            Aucun mot-clé suivi : ajoutez-en ci-dessus ou parmi les pistes ci-dessous.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Recherches réelles non suivies">
          {!gsc.ok ? (
            <p className="text-sm text-brun/55">Non renseigné (Search Console non connecté).</p>
          ) : found.length === 0 ? (
            <p className="text-sm text-brun/55">
              Aucune pour l’instant : elles apparaissent dès qu’une recherche dépasse 3 impressions.
            </p>
          ) : (
            <ul className="divide-y divide-brun/10 text-sm">
              {found.map((f) => (
                <li key={f.keyword} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="font-medium">{f.keyword}</span>
                  <span className="text-xs text-brun/55">
                    {nf(f.impressions)} impressions · position {pos(f.position)}
                  </span>
                  <span className="ml-auto">
                    <AddForm keyword={f.keyword} paths={paths} compact />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Pistes tirées de la structure du site">
          {ideas.length === 0 ? (
            <p className="text-sm text-brun/55">Toutes les pistes sont déjà suivies.</p>
          ) : (
            <ul className="divide-y divide-brun/10 text-sm">
              {ideas.map((i) => (
                <li key={i.keyword} className="flex flex-wrap items-center gap-3 py-2">
                  <span className="font-medium">{i.keyword}</span>
                  <span className="text-xs text-brun/55">→ {i.target}</span>
                  <span className="ml-auto">
                    <AddForm
                      keyword={i.keyword}
                      target={i.target}
                      intent={i.intent}
                      paths={paths}
                      compact
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-brun/50">
            Propositions sans chiffres : leur intérêt réel se lira dans Search Console une fois
            suivies.
          </p>
        </Card>
      </div>
    </>
  );
}
