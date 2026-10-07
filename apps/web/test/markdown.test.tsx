import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/lib/markdown";
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
