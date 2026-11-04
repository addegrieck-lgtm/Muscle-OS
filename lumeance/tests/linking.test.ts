import { describe, expect, it } from "vitest";
import { PUBLISHED_CATALOG } from "@/lib/catalog/products";
import { publishedArticles, ALL_ARTICLES } from "@/lib/content/journal";
import {
  articlesForProduct,
  brokenLinks,
  guidesForRoom,
  linkGraph,
  linkStats,
  liveRooms,
  roomsForProduct,
  suggestLinks,
} from "@/lib/seo/linking";

const products = PUBLISHED_CATALOG;
const categories = [...new Set(products.map((p) => p.categorySlug!))].map((slug) => ({
  slug,
  name: slug,
}));
// Tous les articles du code (y compris programmés) : leurs liens doivent rester valides.
const articles = ALL_ARTICLES;
const STATIC = [
  "/",
  "/collections",
  "/journal",
  "/maison",
  "/restauration",
  "/avantages",
  "/contact",
  "/livraison",
  "/retours",
  "/avis-clients",
];

describe("maillage interne", () => {
  const edges = linkGraph({ products, categories, articles });
  const paths = new Set([
    ...STATIC,
    ...categories.map((c) => `/collections/${c.slug}`),
    ...products.map((p) => `/produit/${p.slug}`),
    ...liveRooms(products).map((r) => `/luminaires/${r.id}`),
    ...articles.map((a) => `/journal/${a.slug}`),
  ]);

  it("aucun lien du contenu ne mène à une page inexistante", () => {
    expect(brokenLinks(edges, paths).map((b) => `${b.from} → ${b.to}`)).toEqual([]);
  });

  it("chaque pièce et chaque page par pièce reçoit au moins 3 liens contextuels", () => {
    const stats = linkStats([...paths], edges);
    for (const s of stats.filter((x) => /^\/(produit|luminaires)\//.test(x.path)))
      expect(s.inbound, s.path).toBeGreaterThanOrEqual(3);
  });

  it("relie pièces, pièces de la maison et guides dans les deux sens", () => {
    const ondee = roomsForProduct(products, "ondee").map((r) => r.id);
    expect(ondee).toContain("escalier");
    const withProducts = articles.find((a) => a.productSlugs?.length)!;
    const slug = withProducts.productSlugs![0]!;
    expect(articlesForProduct(articles, slug).map((a) => a.slug)).toContain(withProducts.slug);
    const escalier = liveRooms(products).find((r) => r.id === "escalier")!;
    for (const g of guidesForRoom(articles, escalier))
      expect(
        (g.productSlugs ?? []).some((s) => escalier.slugs.includes(s)) ||
          g.related.some((r) => r.href === "/luminaires/escalier"),
      ).toBe(true);
  });

  it("propose un lien quand un article cite une pièce sans lien, ou un mot-clé suivi", () => {
    const base = publishedArticles(new Date("2030-01-01"))[0]!;
    const art = {
      ...base,
      slug: "test",
      productSlugs: [],
      related: [],
      sections: [
        {
          heading: "Test",
          paragraphs: ["Le lustre Organza crée un halo doux sur un lustre escalier."],
        },
      ],
    };
    const s = suggestLinks({
      products,
      articles: [art],
      edges: linkGraph({ products, categories, articles: [art] }),
      keywords: [{ keyword: "lustre escalier", target_path: "/luminaires/escalier" }],
      pageTexts: [{ path: "/journal/test", text: art.sections[0]!.paragraphs[0]! }],
    });
    expect(s.map((x) => x.to)).toEqual(["/produit/organza", "/luminaires/escalier"]);
    // « halo » en minuscule n'est pas le nom propre Halo.
    expect(s.some((x) => x.to === "/produit/halo")).toBe(false);
  });
});
