import Link from "next/link";
import { KpiCard, Rise } from "@/components/admin/motion";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { FOOTER_NAV, MAIN_NAV } from "@/lib/navigation";
import {
  brokenLinks,
  linkGraph,
  linkStats,
  navigationPaths,
  suggestLinks,
} from "@/lib/seo/linking";
import { sitePages } from "@/lib/seo/site-pages";
import { getCategories, getProducts } from "@/lib/services/catalog";
import { listPublishedArticles } from "@/lib/services/journal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Maillage interne" };

const KIND_LABEL: Record<string, string> = {
  accueil: "Accueil",
  page: "Page",
  catégorie: "Collection / pièce",
  produit: "Produit",
  article: "Article",
};

export default async function LinkingPage() {
  await requireAdmin();
  const [products, categories, articles] = await Promise.all([
    getProducts(),
    getCategories(),
    listPublishedArticles(),
  ]);
  const supabase = await createSupabaseServerClient();
  const { data: kw } = await supabase.from("seo_keywords").select("keyword, target_path");
  const live = products.filter((p) => !p.isDemo);
  const pages = sitePages(live, categories, articles);
  const paths = new Set([...pages.map((p) => p.path), "/collections", "/journal"]);
  const edges = linkGraph({ products: live, categories, articles });
  const nav = navigationPaths([...MAIN_NAV, ...Object.values(FOOTER_NAV).flat()]);
  const stats = linkStats(
    pages.map((p) => p.path),
    edges,
  ).map((s) => ({ ...s, page: pages.find((p) => p.path === s.path)!, inNav: nav.has(s.path) }));
  const orphans = stats.filter((s) => s.inbound === 0 && !s.inNav && s.path !== "/");
  const weak = stats.filter((s) => s.inbound > 0 && s.inbound <= 2 && !s.inNav);
  const broken = brokenLinks(edges, paths);
  const suggestions = suggestLinks({
    products: live,
    articles,
    edges,
    keywords: (kw as { keyword: string; target_path: string | null }[] | null) ?? [],
    pageTexts: pages.map((p) => ({ path: p.path, text: p.text })),
  });
  const sorted = [...stats].sort((a, b) => a.inbound - b.inbound || a.path.localeCompare(b.path));
  const editOf = (path: string) =>
    stats.find((s) => s.path === path)?.page.editHref ??
    (path.startsWith("/journal/") ? "/admin/journal" : null);

  return (
    <>
      <PageTitle
        title="Maillage interne"
        subtitle="Liens entre les pages du site, hors menu et pied de page, recalculés à chaque visite"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Liens contextuels" value={edges.length} />
        <KpiCard label="Pages orphelines" value={orphans.length} delay={120} />
        <KpiCard label="Pages peu liées (1 ou 2)" value={weak.length} delay={240} />
        <KpiCard label="Liens cassés" value={broken.length} delay={360} />
      </div>

      {(broken.length > 0 || orphans.length > 0) && (
        <Rise className="mt-6">
          <Card title="À corriger">
            <ul className="divide-y divide-brun/10 text-sm">
              {broken.map((b) => (
                <li key={`${b.from}-${b.to}`} className="py-2 text-red-800">
                  Lien cassé : {b.from} → {b.to} (« {b.anchor} »)
                </li>
              ))}
              {orphans.map((o) => (
                <li key={o.path} className="py-2">
                  <span className="font-medium">{o.page.name}</span>{" "}
                  <span className="text-brun/55">{o.path}</span> : aucune page ne la cite. Ajoutez
                  un lien depuis un article ou une page proche.
                </li>
              ))}
            </ul>
          </Card>
        </Rise>
      )}

      <Rise className="mt-6">
        <Card title={`Liens à ajouter (${suggestions.length})`}>
          {suggestions.length === 0 ? (
            <p className="text-sm text-brun/55">
              Aucune proposition : les pièces citées ont leur lien et les mots-clés suivis pointent
              vers leur page cible.
            </p>
          ) : (
            <ul className="divide-y divide-brun/10 text-sm">
              {suggestions.slice(0, 40).map((s) => (
                <li key={`${s.from}-${s.to}-${s.anchor}`} className="flex flex-wrap gap-x-3 py-2">
                  <span>
                    <span className="font-medium">{s.from}</span> → {s.to}{" "}
                    <span className="text-brun/55">(texte du lien : « {s.anchor} »)</span>
                  </span>
                  <span className="text-brun/65">{s.reason}</span>
                  {editOf(s.from) && (
                    <Link
                      href={editOf(s.from)!}
                      className="ml-auto text-xs underline underline-offset-4"
                    >
                      Modifier
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-brun/50">
            Dans le studio, ajoutez la pièce aux « Pièces évoquées » ou une ligne aux « Liens en fin
            d’article ». Pour les mots-clés : suivez-en dans la page Mots-clés, avec une page cible.
          </p>
        </Card>
      </Rise>

      <div className="mt-6 overflow-x-auto border border-brun/10 bg-white/60">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-brun/10 text-[0.68rem] uppercase tracking-[0.12em] text-brun/55">
            <tr>
              <th className="px-3 py-3 font-medium">Page</th>
              <th className="px-3 py-3 text-right font-medium">Liens reçus</th>
              <th className="px-3 py-3 text-right font-medium">Liens émis</th>
              <th className="px-3 py-3 font-medium">Textes des liens reçus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brun/5">
            {sorted.map((s) => (
              <tr key={s.path}>
                <td className="px-3 py-2">
                  <span className="font-medium">{s.page.name}</span>
                  <span className="block text-xs text-brun/50">
                    {KIND_LABEL[s.page.kind] ?? s.page.kind} · {s.path}
                    {s.inNav && " · dans le menu"}
                  </span>
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${s.inbound === 0 && !s.inNav && s.path !== "/" ? "text-red-800" : s.inbound <= 2 && !s.inNav ? "text-[#7a5a1e]" : ""}`}
                >
                  {s.inbound}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{s.outbound}</td>
                <td className="px-3 py-2 text-xs text-brun/60">{s.anchors.join(" · ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
