import { describe, expect, it } from "vitest";
import { ROOMS } from "@/lib/content/home";
import { ROOM_SEO, roomProducts } from "@/lib/content/rooms-seo";
import { PUBLISHED_CATALOG } from "@/lib/catalog/products";
import { auditSite, withSuffix } from "@/lib/seo/audit";

describe("pages par pièce", () => {
  it("chaque pièce de l'accueil a sa page, avec des pièces du catalogue existantes", () => {
    const slugs = new Set(PUBLISHED_CATALOG.map((p) => p.slug));
    for (const r of ROOMS) {
      expect(ROOM_SEO[r.id], r.id).toBeDefined();
      for (const s of r.slugs) expect(slugs.has(s), `${r.id} → ${s}`).toBe(true);
      expect(roomProducts(r.slugs, PUBLISHED_CATALOG).length).toBe(r.slugs.length);
    }
  });

  it("obtiennent 100/100 à l'audit SEO", () => {
    const { audits } = auditSite(
      ROOMS.map((r) => {
        const seo = ROOM_SEO[r.id]!;
        return {
          path: `/luminaires/${r.id}`,
          kind: "catégorie" as const,
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
          internalLinks: r.slugs.length,
        };
      }),
    );
    for (const a of audits)
      expect(
        a.score,
        `${a.path} : ${a.checks
          .filter((c) => c.severity !== "ok")
          .map((c) => c.detail)
          .join(" ; ")}`,
      ).toBe(100);
  });
});
