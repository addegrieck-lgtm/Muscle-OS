import { describe, expect, it } from "vitest";
import { CATALOG_PRODUCTS } from "@/lib/catalog/products";
import {
  ALL_ARTICLES,
  getArticle,
  nextScheduledArticle,
  publishedArticles,
} from "@/lib/content/journal";
import { SEASON_ARTICLES } from "@/lib/content/journal-saison";

const WEEK = 7 * 24 * 3600 * 1000;

describe("Journal : programme éditorial", () => {
  it("compte 15 articles programmés, un par semaine, le mardi à 8 h (Paris)", () => {
    expect(SEASON_ARTICLES).toHaveLength(15);
    const times = SEASON_ARTICLES.map((a) => new Date(a.publishedAt).getTime());
    times.slice(1).forEach((t, i) => expect(t - times[i]!).toBe(WEEK));
    for (const a of SEASON_ARTICLES) {
      const d = new Date(a.publishedAt);
      const paris = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        hour: "2-digit",
        timeZone: "Europe/Paris",
      }).format(d);
      expect(paris).toBe("mardi 08 h");
    }
  });

  it("n'affiche un article qu'à partir de sa date", () => {
    const first = SEASON_ARTICLES[0]!;
    const before = new Date(new Date(first.publishedAt).getTime() - 60_000);
    const after = new Date(first.publishedAt);
    expect(publishedArticles(before).some((a) => a.slug === first.slug)).toBe(false);
    expect(getArticle(first.slug, before)).toBeNull();
    expect(getArticle(first.slug, after)?.slug).toBe(first.slug);
    expect(publishedArticles(after)[0]!.slug).toBe(first.slug); // le plus récent en tête
    expect(nextScheduledArticle(before)?.slug).toBe(first.slug);
  });

  it("a des adresses uniques et des métadonnées de bonne longueur", () => {
    const slugs = ALL_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const a of ALL_ARTICLES) {
      expect(a.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(a.title.length, a.slug).toBeLessThanOrEqual(80);
      expect(a.description.length, a.slug).toBeGreaterThanOrEqual(70);
      expect(a.description.length, a.slug).toBeLessThanOrEqual(160);
    }
  });

  it("ne renvoie que vers des pages et des pièces qui existent", () => {
    const slugs = new Set(ALL_ARTICLES.map((a) => a.slug));
    const pieces = new Set(CATALOG_PRODUCTS.map((p) => p.slug));
    const categories = new Set(["lustres", "suspensions", "appliques", "lampadaires"]);
    for (const a of ALL_ARTICLES) {
      for (const s of a.productSlugs ?? []) expect(pieces.has(s), `${a.slug} → ${s}`).toBe(true);
      for (const r of a.related) {
        const [, section, slug] = r.href.split("/");
        if (section === "journal") {
          expect(slugs.has(slug!), `${a.slug} → ${r.href}`).toBe(true);
          // un lien ne doit pas pointer vers un article publié plus tard
          const target = ALL_ARTICLES.find((x) => x.slug === slug)!;
          expect(
            new Date(target.publishedAt) <= new Date(a.publishedAt),
            `${a.slug} → ${r.href}`,
          ).toBe(true);
        } else if (section === "collections" && slug)
          expect(categories.has(slug), r.href).toBe(true);
        else expect(["collections"]).toContain(section);
      }
    }
  });
});
