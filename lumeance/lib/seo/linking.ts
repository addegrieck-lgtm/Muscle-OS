/**
 * Maillage interne : liens contextuels entre les pages du site (hors menu et pied de page),
 * calculés à partir du contenu publié. Les mêmes fonctions servent aux pages du site (liens
 * réellement affichés) et à l'analyse de l'administration. Fonctions pures, testées.
 */
import { relatedProducts } from "@/lib/catalog/related";
import { ROOMS } from "@/lib/content/home";
import type { Article } from "@/lib/content/journal";
import { ROOM_MIN_PRODUCTS, ROOM_SEO, roomProducts } from "@/lib/content/rooms-seo";
import type { Category, Product } from "@/types/catalog";

type Room = (typeof ROOMS)[number];

/** Pages par pièce publiées (assez de pièces en ligne pour être indexées). */
export function liveRooms(products: Pick<Product, "slug">[]): Room[] {
  return ROOMS.filter(
    (r) => ROOM_SEO[r.id] && roomProducts(r.slugs, products).length >= ROOM_MIN_PRODUCTS,
  );
}

/** Articles qui évoquent une pièce, du plus récent au plus ancien. */
export function articlesForProduct(articles: Article[], slug: string, limit = 3): Article[] {
  return articles.filter((a) => a.productSlugs?.includes(slug)).slice(0, limit);
}

/** Pages par pièce où la pièce est conseillée. */
export function roomsForProduct(products: Pick<Product, "slug">[], slug: string): Room[] {
  return liveRooms(products).filter((r) => r.slugs.includes(slug));
}

/** Guides les plus proches d'une pièce de la maison (pièces évoquées en commun, liens directs). */
export function guidesForRoom(articles: Article[], room: Room, limit = 3): Article[] {
  const score = (a: Article) =>
    (a.productSlugs ?? []).filter((s) => room.slugs.includes(s)).length +
    2 * a.related.filter((r) => r.href === `/luminaires/${room.id}`).length;
  return articles
    .map((a) => ({ a, s: score(a) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, limit)
    .map((x) => x.a);
}

export interface Edge {
  from: string;
  to: string;
  anchor: string;
}

/** Liens contextuels affichés par le site (le menu et le pied de page sont exclus). */
export function linkGraph(input: {
  products: Product[];
  categories: Pick<Category, "slug" | "name">[];
  articles: Article[];
}): Edge[] {
  const { products, articles } = input;
  const live = new Set(products.map((p) => p.slug));
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const rooms = liveRooms(products);
  const e: Edge[] = [];
  const add = (from: string, to: string, anchor: string) => {
    if (from !== to) e.push({ from, to, anchor });
  };

  // Accueil : pièces de la maison, collection, derniers articles.
  for (const r of rooms) add("/", `/luminaires/${r.id}`, r.label);
  add("/", "/collections", "Toute la collection");
  for (const a of articles.slice(0, 3)) add("/", `/journal/${a.slug}`, a.title);

  for (const c of input.categories) {
    const items = products.filter((p) => p.categorySlug === c.slug);
    if (!items.length) continue;
    for (const p of items) add(`/collections/${c.slug}`, `/produit/${p.slug}`, p.name);
  }
  for (const p of products) add("/collections", `/produit/${p.slug}`, p.name);

  for (const r of rooms) {
    const from = `/luminaires/${r.id}`;
    for (const p of roomProducts(r.slugs, products)) add(from, `/produit/${p.slug}`, p.name);
    for (const o of rooms) if (o.id !== r.id) add(from, `/luminaires/${o.id}`, o.label);
    for (const a of guidesForRoom(articles, r)) add(from, `/journal/${a.slug}`, a.title);
  }

  for (const p of products) {
    const from = `/produit/${p.slug}`;
    add(from, `/collections/${p.categorySlug}`, "fil d’Ariane");
    for (const o of relatedProducts(products, p)) add(from, `/produit/${o.slug}`, o.name);
    for (const r of roomsForProduct(products, p.slug)) add(from, `/luminaires/${r.id}`, r.label);
    for (const a of articlesForProduct(articles, p.slug)) add(from, `/journal/${a.slug}`, a.title);
  }

  for (const a of articles) add("/journal", `/journal/${a.slug}`, a.title);
  for (const a of articles) {
    const from = `/journal/${a.slug}`;
    for (const s of (a.productSlugs ?? []).filter((x) => live.has(x)).slice(0, 3))
      add(from, `/produit/${s}`, bySlug.get(s)!.name);
    for (const r of a.related) add(from, r.href.split(/[?#]/)[0]!, r.label);
  }
  return e;
}

export interface PageLinks {
  path: string;
  inbound: number;
  outbound: number;
  anchors: string[];
}

/** Liens entrants et sortants (sources distinctes) par page. */
export function linkStats(paths: string[], edges: Edge[]): PageLinks[] {
  return paths.map((path) => {
    const ins = edges.filter((x) => x.to === path);
    return {
      path,
      inbound: new Set(ins.map((x) => x.from)).size,
      outbound: new Set(edges.filter((x) => x.from === path).map((x) => x.to)).size,
      anchors: [...new Set(ins.map((x) => x.anchor))].slice(0, 6),
    };
  });
}

/** Liens vers des pages qui n'existent pas (ou plus) parmi les pages publiques. */
export const brokenLinks = (edges: Edge[], paths: Set<string>) =>
  edges.filter((x) => !paths.has(x.to));

export interface Suggestion {
  from: string;
  to: string;
  anchor: string;
  reason: string;
}

const textOf = (a: Article) =>
  [a.excerpt, ...a.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join(" ");

/**
 * Propositions de liens (à valider) :
 * - un article cite une pièce par son nom sans la proposer en fin d'article ;
 * - une page contient un mot-clé suivi sans renvoyer vers sa page cible.
 */
export function suggestLinks(input: {
  products: Product[];
  articles: Article[];
  edges: Edge[];
  keywords: { keyword: string; target_path: string | null }[];
  pageTexts: { path: string; text: string }[];
}): Suggestion[] {
  const out: Suggestion[] = [];
  const linked = new Set(input.edges.map((x) => `${x.from}→${x.to}`));
  const has = (from: string, to: string) => linked.has(`${from}→${to}`);
  for (const a of input.articles) {
    const from = `/journal/${a.slug}`;
    const text = textOf(a);
    for (const p of input.products) {
      const to = `/produit/${p.slug}`;
      // Nom propre de la pièce, avec sa majuscule, en mot entier.
      const re = new RegExp(
        `(^|[^\\p{L}])${p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`,
        "u",
      );
      if (!has(from, to) && re.test(text))
        out.push({
          from,
          to,
          anchor: p.name,
          reason: `L’article cite ${p.name} sans lien vers sa fiche.`,
        });
    }
  }
  for (const k of input.keywords) {
    if (!k.target_path) continue;
    const needle = k.keyword.toLowerCase();
    for (const pt of input.pageTexts) {
      if (pt.path === k.target_path || has(pt.path, k.target_path)) continue;
      if (pt.text.toLowerCase().includes(needle))
        out.push({
          from: pt.path,
          to: k.target_path,
          anchor: k.keyword,
          reason: `La page parle de « ${k.keyword} » sans renvoyer vers la page cible.`,
        });
    }
  }
  return out;
}

/** Pages présentes dans le menu ou le pied de page (liées depuis toutes les pages). */
export function navigationPaths(nav: { href: string }[]): Set<string> {
  return new Set(nav.map((n) => n.href));
}
