import { z } from "zod";
import { textToFaq, textToLinks, textToSections } from "@/lib/content/article-format";
import { ART_FORMS } from "@/lib/content/journal-db";

const link = (internal: boolean) =>
  z.object({
    label: z.string().min(2).max(120),
    href: internal
      ? z.string().regex(/^\/[^\s/][^\s]*$|^\/$/, "Lien interne : commencer par /")
      : z.string().url("Adresse de source invalide").startsWith("https://", "Source en https"),
  });

/** Formulaire du studio → champs de la table journal_articles (statut et dates à part). */
export const articleFormSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Adresse : minuscules, chiffres et tirets")
      .max(90),
    category: z.string().trim().min(2, "Rubrique trop courte").max(60),
    title: z.string().trim().min(10, "Titre trop court").max(120),
    description: z
      .string()
      .trim()
      .min(50, "Description : au moins 50 caractères")
      .max(200, "Description : 200 caractères au plus"),
    excerpt: z.string().trim().min(20, "Chapô trop court").max(300),
    art: z.enum(ART_FORMS as [string, ...string[]]),
    body: z.string().max(40000),
    faq: z.string().max(10000),
    related: z.string().max(3000),
    sources: z.string().max(3000),
    product_slugs: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(6),
    notes: z.string().max(2000),
  })
  .transform((d, ctx) => {
    const sections = textToSections(d.body);
    if (!sections.length || sections.some((s) => !s.heading))
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "Le texte doit commencer par un intertitre « ## … »",
      });
    const related = textToLinks(d.related);
    const sources = textToLinks(d.sources);
    const r = z.array(link(true)).safeParse(related);
    if (!r.success)
      ctx.addIssue({ code: "custom", path: ["related"], message: r.error.issues[0]!.message });
    const s = z.array(link(false)).safeParse(sources);
    if (!s.success)
      ctx.addIssue({ code: "custom", path: ["sources"], message: s.error.issues[0]!.message });
    return {
      slug: d.slug,
      category: d.category,
      title: d.title,
      description: d.description,
      excerpt: d.excerpt,
      art: d.art,
      sections,
      faq: textToFaq(d.faq),
      related: related.map((l) => ({ label: l.label, href: l.href })),
      sources: sources.map((l) => ({ label: l.label, href: l.href })),
      product_slugs: d.product_slugs,
      notes: d.notes.trim() || null,
    };
  });

export type ArticleFormValues = z.infer<typeof articleFormSchema>;

/** Lecture d'un FormData du studio. */
export function readArticleForm(fd: FormData) {
  const s = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  return articleFormSchema.safeParse({
    slug: s("slug"),
    category: s("category"),
    title: s("title"),
    description: s("description"),
    excerpt: s("excerpt"),
    art: s("art") || "tiers",
    body: s("body"),
    faq: s("faq"),
    related: s("related"),
    sources: s("sources"),
    product_slugs: fd.getAll("product_slugs").filter((v): v is string => typeof v === "string"),
    notes: s("notes"),
  });
}
