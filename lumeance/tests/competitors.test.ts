import { describe, expect, it } from "vitest";
import {
  newUrls,
  normalizeDomain,
  parsePageMeta,
  parseSitemap,
  priceGap,
  robotsAllows,
  robotsSitemaps,
} from "@/lib/seo/competitors";

describe("veille concurrentielle", () => {
  it("n'accepte que des domaines publics", () => {
    expect(normalizeDomain("https://www.Exemple-Luminaires.fr/lustres?x=1")).toBe(
      "www.exemple-luminaires.fr",
    );
    expect(normalizeDomain("exemple.fr")).toBe("exemple.fr");
    for (const bad of ["localhost", "192.168.1.10", "intranet.local", "pas un domaine", "x"])
      expect(normalizeDomain(bad), bad).toBeNull();
  });

  it("respecte le robots.txt (groupe dédié, sinon *, règle la plus précise)", () => {
    const robots = `User-agent: *\nDisallow: /panier\nDisallow: /*?filtre=\nAllow: /panier/aide\nSitemap: https://e.fr/sitemap_index.xml\n\nUser-agent: LumeanceVeille\nDisallow: /`;
    expect(robotsAllows(robots, "/")).toBe(false);
    expect(robotsAllows(robots, "/", "AutreRobot")).toBe(true);
    expect(robotsAllows(robots, "/panier", "AutreRobot")).toBe(false);
    expect(robotsAllows(robots, "/panier/aide", "AutreRobot")).toBe(true);
    expect(robotsAllows(robots, "/lustres?filtre=or", "AutreRobot")).toBe(false);
    expect(robotsAllows("", "/")).toBe(true);
    expect(robotsAllows("User-agent: *\nDisallow: /fin$", "/fin/suite")).toBe(true);
    expect(robotsSitemaps(robots)).toEqual(["https://e.fr/sitemap_index.xml"]);
  });

  it("lit titre, description, données structurées et plans du site", () => {
    const m = parsePageMeta(
      `<title> Lustres &amp; suspensions </title><meta content="Luminaires design" name="description"><script type="application/ld+json">{"@type":"Organization"}</script>`,
    );
    expect(m).toEqual({
      title: "Lustres & suspensions",
      description: "Luminaires design",
      structuredTypes: ["Organization"],
    });
    expect(
      parseSitemap("<sitemapindex><sitemap><loc>https://e.fr/p.xml</loc></sitemap></sitemapindex>"),
    ).toEqual({ urls: [], sitemaps: ["https://e.fr/p.xml"] });
    expect(parseSitemap("<urlset><url><loc> https://e.fr/a </loc></url></urlset>").urls).toEqual([
      "https://e.fr/a",
    ]);
  });

  it("repère les nouvelles pages et calcule l'écart de prix", () => {
    expect(newUrls(["a", "b"], ["b", "c"])).toEqual(["c"]);
    expect(priceGap(110_00, 100_00)).toBe(10);
    expect(priceGap(90_00, 100_00)).toBe(-10);
  });
});
