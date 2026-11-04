import { describe, expect, it } from "vitest";
import {
  faqToText,
  isoToParisLocal,
  linksToText,
  parisLocalToIso,
  sectionsToText,
  slugify,
  textToFaq,
  textToLinks,
  textToSections,
} from "@/lib/content/article-format";
import { ALL_ARTICLES } from "@/lib/content/journal";
import { articleToRow, mergeArticles, type ArticleRow } from "@/lib/content/journal-db";
import { PROPOSALS } from "@/lib/content/journal-propositions";
import { displayStatus } from "@/lib/content/journal-status";
import { PUBLISHED_CATALOG } from "@/lib/catalog/products";
import { auditPage, withSuffix } from "@/lib/seo/audit";
import { readArticleForm } from "@/lib/validation/journal";

const row = (slug: string, over: Partial<ArticleRow> = {}): ArticleRow => ({
  id: slug,
  ...articleToRow({ ...PROPOSALS[0]!, slug }, "studio"),
  status: "published",
  published_at: "2026-01-01T08:00:00Z",
  approved_at: "2026-01-01T08:00:00Z",
  notes: null,
  updated_at: "2026-01-01T08:00:00Z",
  ...over,
});

describe("studio : format d'édition", () => {
  it("relit sans perte tous les articles existants", () => {
    for (const a of [...ALL_ARTICLES, ...PROPOSALS]) {
      expect(textToSections(sectionsToText(a.sections))).toEqual(a.sections);
      expect(textToFaq(faqToText(a.faq ?? []))).toEqual(a.faq ?? []);
      expect(textToLinks(linksToText(a.related))).toEqual(a.related);
    }
  });

  it("joint les lignes d'un même paragraphe et ignore les liens mal formés", () => {
    expect(textToSections("## A\nune\nphrase\n\nautre\n## B\nfin")).toEqual([
      { heading: "A", paragraphs: ["une phrase", "autre"] },
      { heading: "B", paragraphs: ["fin"] },
    ]);
    expect(textToLinks("Bon | /a\nsans barre\n | /b")).toEqual([{ label: "Bon", href: "/a" }]);
  });

  it("convertit l'heure de Paris (hiver et été) et fabrique une adresse", () => {
    expect(parisLocalToIso("2026-11-10T08:00")).toBe("2026-11-10T07:00:00.000Z");
    expect(parisLocalToIso("2026-07-10T08:00")).toBe("2026-07-10T06:00:00.000Z");
    expect(isoToParisLocal("2026-07-10T06:00:00.000Z")).toBe("2026-07-10T08:00");
    expect(parisLocalToIso("demain")).toBeNull();
    expect(slugify("Éclairer l’îlot : 3 conseils !")).toBe("eclairer-l-ilot-3-conseils");
  });
});

describe("studio : publication", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const code = [
    { ...ALL_ARTICLES[0]!, slug: "code-seul", publishedAt: "2026-01-01T00:00:00Z" },
    { ...ALL_ARTICLES[0]!, slug: "repris", publishedAt: "2026-01-01T00:00:00Z" },
  ];

  it("n'affiche que les articles validés et datés, et le studio remplace le code", () => {
    const list = mergeArticles(
      code,
      [
        row("repris", { status: "draft", approved_at: null }),
        row("en-ligne"),
        row("programme", { published_at: "2026-09-01T00:00:00Z" }),
        row("relire", { status: "review", approved_at: null }),
      ],
      now,
    );
    expect(list.map((a) => a.slug).sort()).toEqual(["code-seul", "en-ligne"]);
  });

  it("affiche le bon statut", () => {
    expect(displayStatus("published", "2026-09-01T00:00:00Z", now).label).toBe("Programmé");
    expect(displayStatus("published", "2026-01-01T00:00:00Z", now).label).toBe("En ligne");
    expect(displayStatus("review", null, now).label).toBe("À relire");
  });
});

describe("studio : formulaire", () => {
  const fd = (over: Record<string, string> = {}) => {
    const f = new FormData();
    const base: Record<string, string> = {
      slug: "un-article",
      category: "Guides",
      title: "Un article de test assez long",
      description: "Une description de test suffisamment longue pour passer la validation.",
      excerpt: "Un chapô de test pour l’article.",
      art: "halo",
      body: "## Intertitre\n\nParagraphe un.\n\nParagraphe deux.",
      faq: "Q : Une question ?\nR : Une réponse.",
      related: "Les lustres | /collections/lustres",
      sources: "",
      notes: "",
      ...over,
    };
    for (const [k, v] of Object.entries(base)) f.set(k, v);
    f.append("product_slugs", "halo");
    return f;
  };

  it("accepte un article complet", () => {
    const r = readArticleForm(fd());
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sections[0]!.paragraphs).toHaveLength(2);
      expect(r.data.faq).toEqual([{ q: "Une question ?", a: "Une réponse." }]);
      expect(r.data.product_slugs).toEqual(["halo"]);
    }
  });

  it("refuse un texte sans intertitre, un lien externe et une source non https", () => {
    expect(readArticleForm(fd({ body: "Juste un paragraphe." })).success).toBe(false);
    expect(readArticleForm(fd({ related: "Ailleurs | https://exemple.fr" })).success).toBe(false);
    expect(readArticleForm(fd({ sources: "Étude | http://exemple.fr" })).success).toBe(false);
    expect(readArticleForm(fd({ sources: "Étude | https://exemple.fr/etude" })).success).toBe(true);
  });
});

describe("propositions de la rédaction", () => {
  it("sont complètes, liées à des pièces et des pages existantes, sans source inventée", () => {
    const live = new Set(PUBLISHED_CATALOG.map((p) => p.slug));
    const articles = new Set(ALL_ARTICLES.map((a) => a.slug));
    for (const a of PROPOSALS) {
      expect(articles.has(a.slug), a.slug).toBe(false);
      for (const s of a.productSlugs ?? []) expect(live.has(s), s).toBe(true);
      for (const r of a.related)
        if (r.href.startsWith("/journal/"))
          expect(articles.has(r.href.slice(9)), r.href).toBe(true);
      expect("sources" in a).toBe(false);
      const audit = auditPage(
        {
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
          internalLinks: (a.productSlugs ?? []).length + a.related.length,
        },
        { title: new Set(), description: new Set() },
      );
      expect(
        audit.score,
        `${a.slug} : ${audit.checks
          .filter((c) => c.severity !== "ok")
          .map((c) => c.detail)
          .join(" ; ")}`,
      ).toBe(100);
    }
  });
});
