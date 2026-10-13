import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/lib/markdown";
import { existsSync } from "node:fs";
import { GUIDES } from "@/content/guides";

const html = (src: string) => renderToStaticMarkup(<Markdown source={src} />);

describe("Markdown", () => {
  it("rend titres, listes, gras et code", () => {
    const out = html("## Titre\n\n- un **gras**\n- `code`\n\n1. premier\n2. second");
    expect(out).toContain("<h2>Titre</h2>");
    expect(out).toContain("<li>un <strong>gras</strong></li>");
    expect(out).toContain("<code>code</code>");
    expect(out).toContain("<ol>");
  });

  it("n'interprète jamais de HTML brut (XSS)", () => {
    const out = html('<script>alert(1)</script> <img src=x onerror="alert(1)">');
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });

  it("rend les tableaux avec en-têtes", () => {
    const out = html("| Règle | Valeur |\n| --- | --- |\n| Power | **5** |");
    expect(out).toContain('<th scope="col">Règle</th>');
    expect(out).toContain("<td><strong>5</strong></td>");
  });

  it("n'accepte que les liens internes ou https", () => {
    expect(html("[ok](/rules)")).toContain('href="/rules"');
    expect(html("[ext](https://exemple.fr)")).toContain('rel="noopener noreferrer"');
    const js = html("[piège](javascript:alert(1))");
    expect(js).not.toContain("href");
    expect(js).toContain("piège");
  });
});

describe("Guides", () => {
  it("ont des slugs uniques et des liens internes valides", () => {
    const slugs = new Set(GUIDES.map((g) => g.slug));
    expect(slugs.size).toBe(GUIDES.length);
    for (const g of GUIDES) {
      for (const [, href] of g.body.matchAll(/\]\((\/guides\/[^)]+)\)/g)) {
        expect(slugs.has(href!.replace("/guides/", "")), `${g.slug} → ${href}`).toBe(true);
      }
    }
  });
});

describe("Guides : SEO", () => {
  it("ont un titre court et unique, et des liens « À lire aussi » vers des pages existantes", () => {
    const titles = new Set(GUIDES.map((g) => g.seoTitle));
    expect(titles.size).toBe(GUIDES.length);
    for (const g of GUIDES) {
      // ≤ 50 caractères + « · VÆLORIA » : le titre reste lisible dans les résultats.
      expect(g.seoTitle.length, g.slug).toBeLessThanOrEqual(52);
      expect(g.description.length, g.slug).toBeLessThanOrEqual(170);
      for (const r of g.related) {
        const route = r.href.startsWith("/guides/") ? GUIDES.some((x) => `/guides/${x.slug}` === r.href) : existsSync(new URL(`../app${r.href}`, import.meta.url));
        expect(route, `${g.slug} → ${r.href}`).toBe(true);
      }
    }
  });
});
