import type { Metadata } from "next";
import { BRAND } from "@vaeloria/config";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? BRAND.siteUrl).replace(/\/$/, "");

/** Métadonnées cohérentes par page : titre, description, canonical, OpenGraph, Twitter. */
export function pageMeta({ title, description, path, type = "website", noindex = false }: { title: string; description: string; path: string; type?: "website" | "article"; noindex?: boolean }): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type, siteName: BRAND.name, locale: BRAND.locale },
    twitter: { card: "summary_large_image", title, description },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
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
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
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
    mainEntityOfPage: `${SITE_URL}${a.path}`,
    datePublished: a.publishedAt,
    dateModified: a.updatedAt,
    author: { "@type": "Organization", name: a.author },
    publisher: { "@type": "Organization", name: BRAND.name, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` } },
  };
}
