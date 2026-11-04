import "server-only";
import type { Metadata } from "next";
import { metadata as cgv } from "@/app/(store)/cgv/page";
import { metadata as confidentialite } from "@/app/(store)/confidentialite/page";
import { metadata as contact } from "@/app/(store)/contact/page";
import { metadata as journal } from "@/app/(store)/journal/page";
import { metadata as livraison } from "@/app/(store)/livraison/page";
import { metadata as maison } from "@/app/(store)/maison/page";
import { metadata as mentions } from "@/app/(store)/mentions-legales/page";
import { metadata as home } from "@/app/(store)/page";
import { metadata as restauration } from "@/app/(store)/restauration/page";
import { metadata as retours } from "@/app/(store)/retours/page";
import { CATEGORY_SEO } from "@/lib/content/categories";
import { ROOMS } from "@/lib/content/home";
import { ROOM_MIN_PRODUCTS, ROOM_SEO, roomProducts } from "@/lib/content/rooms-seo";
import { publishedArticles } from "@/lib/content/journal";
import { categoryLabel } from "@/lib/navigation";
import { withSuffix, type PageInput } from "@/lib/seo/audit";
import { LEGAL_PATHS, LEGAL_PENDING } from "@/lib/seo/legal";
import type { Category, Product } from "@/types/catalog";

const titleOf = (m: Metadata): string => {
  const t = m.title;
  if (!t) return "";
  if (typeof t === "string") return withSuffix(t);
  if ("absolute" in t && t.absolute) return t.absolute;
  return "";
};

/** Toutes les pages publiques du site, prêtes pour l'audit. */
export function sitePages(products: Product[], categories: Category[]): PageInput[] {
  const statics: [string, string, Metadata][] = [
    ["/", "Accueil", home],
    ["/maison", "La Maison", maison],
    ["/restauration", "Restaurants, bars et hôtels", restauration],
    ["/journal", "Journal", journal],
    ["/contact", "Contact", contact],
    ["/livraison", "Livraison", livraison],
    ["/retours", "Retours et garanties", retours],
    ["/cgv", "CGV", cgv],
    ["/mentions-legales", "Mentions légales", mentions],
    ["/confidentialite", "Confidentialité", confidentialite],
  ];
  // Pages hors index (légales incomplètes) : non auditées.
  const pages: PageInput[] = statics
    .filter(([path]) => !(LEGAL_PENDING && LEGAL_PATHS.includes(path)))
    .map(([path, name, m]) => ({
      path,
      kind: path === "/" ? "accueil" : "page",
      name,
      title: titleOf(m),
      description: String(m.description ?? ""),
      text: "",
    }));

  // Catégories sans pièce : hors index, non auditées.
  for (const c of categories.filter((c) => products.some((p) => p.categorySlug === c.slug))) {
    const seo = CATEGORY_SEO[c.slug];
    pages.push({
      path: `/collections/${c.slug}`,
      kind: "catégorie",
      name: c.name,
      title: withSuffix(seo?.title ?? c.name),
      description: seo?.description ?? c.description ?? "",
      text: (seo?.body ?? []).join(" "),
      minWords: 80,
      keywords: [c.name.replace(/s$/, "")],
      internalLinks: products.filter((p) => p.categorySlug === c.slug).length,
    });
  }

  // Entrées par pièce de la maison (hors index sous ROOM_MIN_PRODUCTS pièces : non auditées).
  for (const r of ROOMS) {
    const seo = ROOM_SEO[r.id];
    const items = roomProducts(r.slugs, products);
    if (!seo || items.length < ROOM_MIN_PRODUCTS) continue;
    pages.push({
      path: `/luminaires/${r.id}`,
      kind: "catégorie",
      name: r.label,
      title: withSuffix(seo.title),
      description: seo.description,
      text: [
        seo.intro,
        ...seo.sections.flatMap((s) => [s.h2, ...s.body]),
        ...seo.faq.flatMap((f) => [f.q, f.a]),
      ].join(" "),
      minWords: 250,
      keywords: [seo.keyword],
      internalLinks: items.length,
    });
  }

  for (const p of products.filter((x) => !x.isDemo)) {
    pages.push({
      path: `/produit/${p.slug}`,
      kind: "produit",
      name: p.name,
      title: withSuffix(p.seoTitle ?? `${p.name} — ${categoryLabel(p.categorySlug)}`),
      description: p.seoDescription ?? p.shortDescription ?? "",
      text: [p.description, ...p.specifications.map((s) => `${s.label} ${s.value}`)].join(" "),
      minWords: 120,
      keywords: [p.name],
      images: p.images.map((i) => ({ alt: i.alt })),
      structured: p.price > 0 && p.images.length > 0,
      editHref: `/admin/products?q=${encodeURIComponent(p.reference)}`,
    });
  }

  const live = new Set(products.map((p) => p.slug));
  for (const a of publishedArticles()) {
    pages.push({
      path: `/journal/${a.slug}`,
      kind: "article",
      name: a.title,
      title: withSuffix(a.title),
      description: a.description,
      text: [
        ...a.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
        ...(a.faq ?? []).flatMap((f) => [f.q, f.a]),
      ].join(" "),
      minWords: 500,
      internalLinks: (a.productSlugs ?? []).filter((s) => live.has(s)).length + a.related.length,
    });
  }
  return pages;
}
