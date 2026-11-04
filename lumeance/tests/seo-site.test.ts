import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { PUBLISHED_CATALOG } from "@/lib/catalog/products";
import { publishedArticles } from "@/lib/content/journal";
import { auditSite } from "@/lib/seo/audit";
import { brokenLinks, linkGraph } from "@/lib/seo/linking";
import { sitePages } from "@/lib/seo/site-pages";

describe("SEO de l'ensemble du site (contenu du code)", () => {
  const products = PUBLISHED_CATALOG;
  const categories = [...new Set(products.map((p) => p.categorySlug!))].map((slug) => ({
    id: slug,
    slug,
    name: slug,
    description: null,
    sortOrder: 0,
  }));
  const articles = publishedArticles();
  const pages = sitePages(products, categories as never, articles);

  it("chaque page publique obtient au moins 90 à l'audit, sans erreur", () => {
    const { audits, errors } = auditSite(pages);
    const weak = audits
      .filter((a) => a.score < 90)
      .map(
        (a) =>
          `${a.path} ${a.score} : ${a.checks
            .filter((c) => c.severity !== "ok")
            .map((c) => c.detail)
            .join(" ; ")}`,
      );
    expect(weak).toEqual([]);
    expect(errors).toBe(0);
  });

  it("aucun titre ni description en double", () => {
    const titles = pages.map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("aucun lien interne cassé entre pages publiées", () => {
    const paths = new Set([...pages.map((p) => p.path), "/collections", "/journal"]);
    expect(brokenLinks(linkGraph({ products, categories, articles }), paths)).toEqual([]);
  });
});
