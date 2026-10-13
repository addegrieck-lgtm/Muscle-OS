import type { Metadata } from "next";
import { BRAND } from "@vaeloria/config";
import { PREVIEW } from "./preview";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl).replace(/\/$/, "");

/** URL canonique d'un chemin. L'export statique sert les pages en « /chemin/ » (trailingSlash). */
export const canonicalUrl = (path: string) => `${SITE_URL}${path === "/" || !PREVIEW ? path : `${path}/`}`;

/** Image de partage par défaut (1200×630), aussi utilisée par Discord, X et WhatsApp. */
export const OG_IMAGE = { url: "/og/vaeloria.png", width: 1200, height: 630, alt: "VÆLORIA — serveur Minecraft Faction & PvP français" };

/**
 * Métadonnées cohérentes par page : titre, description, canonical, OpenGraph, Twitter.
 * `live` : page alimentée par l'API (classements, empires…). En export statique elle est vide,
 * donc exclue de l'index pour ne pas présenter de pages creuses aux moteurs.
 * `absoluteTitle` : titre complet, sans le suffixe « · VÆLORIA » du gabarit.
 */
export function pageMeta({ title, description, path, type = "website", noindex = false, live = false, absoluteTitle = false }: { title: string; description: string; path: string; type?: "website" | "article"; noindex?: boolean; live?: boolean; absoluteTitle?: boolean }): Metadata {
  const url = canonicalUrl(path);
  const fullTitle = absoluteTitle ? title : `${title} · ${BRAND.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description, url, type, siteName: BRAND.name, locale: BRAND.locale, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [OG_IMAGE.url] },
    ...(noindex || (live && PREVIEW) ? { robots: { index: false, follow: true } } : {}),
  };
}

export function JsonLd({ data }: { data: object }) {
  // JSON.stringify échappe les guillemets ; on neutralise aussi "</" pour éviter de fermer la balise script.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: canonicalUrl(it.path) })),
  };
}

export function faqLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answer } })),
  };
}

export function articleLd(a: { title: string; description: string; path: string; publishedAt: string; updatedAt: string; author: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    mainEntityOfPage: canonicalUrl(a.path),
    datePublished: a.publishedAt,
    dateModified: a.updatedAt,
    author: { "@type": "Organization", name: a.author },
    publisher: { "@type": "Organization", name: BRAND.name, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` } },
  };
}

/** Page introuvable (ou placeholder d'un export statique sans données) : jamais indexée. */
export const NOT_FOUND_META: Metadata = { title: "Page introuvable", robots: { index: false, follow: false } };

/** Site et éditeur, déclarés une fois sur l'accueil. */
export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    alternateName: BRAND.asciiName,
    url: `${SITE_URL}/`,
    inLanguage: "fr-FR",
  };
}
