import Link from "next/link";
import { notFound } from "next/navigation";
import { ScoreRing } from "@/components/admin/motion";
import { Badge, Card, Field, Flash, PageTitle, flashFrom, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import {
  faqToText,
  isoToParisLocal,
  linksToText,
  sectionsToText,
} from "@/lib/content/article-format";
import { ART_FORMS, rowToArticle, type ArticleRow } from "@/lib/content/journal-db";
import { displayStatus } from "@/lib/content/journal-status";
import { siteUrl } from "@/lib/env";
import { auditPage, withSuffix, type Severity } from "@/lib/seo/audit";
import { getProducts } from "@/lib/services/catalog";
import { ARTICLE_COLUMNS } from "@/lib/services/journal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  archiveArticle,
  deleteArticle,
  markForReview,
  publishArticle,
  saveArticle,
  unpublishArticle,
} from "../actions";

export const metadata = { title: "Article — studio éditorial" };

const DOT: Record<Severity, string> = {
  ok: "bg-emerald-600",
  warn: "bg-champagne",
  error: "bg-red-700",
};
const ART_LABEL: Record<string, string> = {
  cascade: "Cascade",
  globes: "Globes",
  halo: "Halo",
  organic: "Organique",
  tiers: "Étages",
  dome: "Dôme",
  sconce: "Applique",
  floor: "Lampadaire",
};
const BODY_HINT =
  "Une ligne « ## Intertitre », puis les paragraphes séparés par une ligne vide. Visez 600 mots ou plus.";

export default async function ArticleEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin(CATALOG_ROLES);
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "nouveau";
  let row: ArticleRow | null = null;
  if (!isNew) {
    if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("journal_articles")
      .select(ARTICLE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (!data) notFound();
    row = data as ArticleRow;
  }
  const products = await getProducts();
  const a = row ? rowToArticle(row) : null;
  const live = new Set(products.map((p) => p.slug));
  const audit = a
    ? auditPage(
        {
          path: `/journal/${a.slug}`,
          kind: "article",
          name: a.title,
          title: withSuffix(a.title),
          description: a.description,
          text: [
            a.excerpt,
            ...a.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
            ...(a.faq ?? []).flatMap((f) => [f.q, f.a]),
          ].join(" "),
          minWords: 500,
          internalLinks:
            (a.productSlugs ?? []).filter((s) => live.has(s)).length + a.related.length,
        },
        { title: new Set(), description: new Set() },
      )
    : null;
  const status = row ? displayStatus(row.status, row.published_at) : null;
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

  return (
    <>
      <PageTitle
        title={a?.title ?? "Nouvel article"}
        subtitle={a ? `/journal/${a.slug}` : "Brouillon : rien ne paraît avant votre validation"}
        actions={
          <Link href="/admin/journal" className="text-xs underline underline-offset-4">
            ← Studio
          </Link>
        }
      />
      <Flash {...flashFrom(sp)} />

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <form action={saveArticle} className="grid gap-4">
            {row && <input type="hidden" name="id" value={row.id} />}
            <Field label="Titre" hint="Visible dans Google : 50 à 60 caractères conseillés.">
              <input
                name="title"
                required
                minLength={10}
                maxLength={120}
                defaultValue={row?.title}
                className={inputClass}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Adresse (slug)" hint="Minuscules et tirets, ex. eclairer-un-ilot">
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  maxLength={90}
                  defaultValue={row?.slug}
                  className={inputClass}
                />
              </Field>
              <Field label="Rubrique">
                <input
                  name="category"
                  required
                  defaultValue={row?.category ?? "Conseils pièce par pièce"}
                  list="rubriques"
                  className={inputClass}
                />
                <datalist id="rubriques">
                  {[
                    "Guides d’achat",
                    "Conseils pièce par pièce",
                    "Guides techniques",
                    "Ambiances",
                    "Entretien",
                  ].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
            </div>
            <Field
              label="Description (Google)"
              hint="120 à 160 caractères : elle s’affiche sous le titre dans Google."
            >
              <textarea
                name="description"
                rows={2}
                required
                minLength={50}
                maxLength={200}
                defaultValue={row?.description}
                className={inputClass}
              />
            </Field>
            <Field
              label="Chapô"
              hint="Introduction affichée en tête d’article et dans la liste du journal."
            >
              <textarea
                name="excerpt"
                rows={2}
                required
                minLength={20}
                maxLength={300}
                defaultValue={row?.excerpt}
                className={inputClass}
              />
            </Field>
            <Field label="Texte" hint={BODY_HINT}>
              <textarea
                name="body"
                rows={22}
                defaultValue={row ? sectionsToText(row.sections) : "## Premier intertitre\n\n"}
                className={`${inputClass} font-mono text-[0.82rem] leading-relaxed`}
              />
            </Field>
            <Field
              label="Questions fréquentes"
              hint="« Q : question » puis « R : réponse », un bloc par question, séparés par une ligne vide."
            >
              <textarea
                name="faq"
                rows={6}
                defaultValue={row ? faqToText(row.faq) : ""}
                className={`${inputClass} font-mono text-[0.82rem]`}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Liens en fin d’article" hint="Une ligne par lien : Libellé | /adresse">
                <textarea
                  name="related"
                  rows={3}
                  defaultValue={row ? linksToText(row.related) : ""}
                  className={`${inputClass} font-mono text-[0.82rem]`}
                />
              </Field>
              <Field
                label="Sources"
                hint="Uniquement des sources réelles et vérifiées : Libellé | https://…"
              >
                <textarea
                  name="sources"
                  rows={3}
                  defaultValue={row ? linksToText(row.sources) : ""}
                  className={`${inputClass} font-mono text-[0.82rem]`}
                />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.14em] text-brun/60">
                Pièces évoquées (3 affichées au plus)
              </legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {products
                  .filter((p) => !p.isDemo)
                  .map((p) => (
                    <label key={p.slug} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="product_slugs"
                        value={p.slug}
                        defaultChecked={row?.product_slugs.includes(p.slug)}
                      />
                      {p.name}
                    </label>
                  ))}
              </div>
            </fieldset>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Illustration">
                <select name="art" defaultValue={row?.art ?? "tiers"} className={inputClass}>
                  {ART_FORMS.map((f) => (
                    <option key={f} value={f}>
                      {ART_LABEL[f] ?? f}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Note interne (non publiée)">
                <input name="notes" defaultValue={row?.notes ?? ""} className={inputClass} />
              </Field>
            </div>
            <div>
              <SubmitButton>{isNew ? "Créer le brouillon" : "Enregistrer"}</SubmitButton>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          {row && status && (
            <Card title="Publication">
              <p className="flex items-center gap-2 text-sm">
                <Badge value={status.key} label={status.label} />
                {row.published_at && row.status === "published" && (
                  <span className="text-brun/60">
                    {status.key === "scheduled" ? "paraîtra le" : "depuis le"}{" "}
                    {new Date(row.published_at).toLocaleString("fr-FR", {
                      dateStyle: "long",
                      timeStyle: "short",
                      timeZone: "Europe/Paris",
                    })}
                  </span>
                )}
              </p>
              <Link
                href={`/journal/${row.slug}?apercu=1`}
                target="_blank"
                className="mt-3 inline-block text-xs underline underline-offset-4"
              >
                Voir l’aperçu sur le site
              </Link>

              <form action={publishArticle} className="mt-5 space-y-3 border-t border-brun/10 pt-4">
                <input type="hidden" name="id" value={row.id} />
                <p className="text-xs text-brun/55">
                  Enregistrez vos modifications avant de valider.
                </p>
                <Field
                  label="Date de mise en ligne (heure de Paris)"
                  hint="Vide : publication immédiate."
                >
                  <input
                    type="datetime-local"
                    name="published_at"
                    defaultValue={row.published_at ? isoToParisLocal(row.published_at) : ""}
                    className={inputClass}
                  />
                </Field>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="verifie" className="mt-1" />
                  <span>
                    J’ai relu l’article : les conseils et informations sont exacts, aucune
                    caractéristique de produit ni source n’est inventée.
                  </span>
                </label>
                <SubmitButton>
                  {row.status === "published" ? "Revalider (date)" : "Valider et publier"}
                </SubmitButton>
              </form>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-brun/10 pt-4">
                {row.status === "published" && (
                  <form action={unpublishArticle}>
                    <input type="hidden" name="id" value={row.id} />
                    <SubmitButton variant="secondary" confirm="Retirer cet article du site ?">
                      Dépublier
                    </SubmitButton>
                  </form>
                )}
                {row.status === "draft" && (
                  <form action={markForReview}>
                    <input type="hidden" name="id" value={row.id} />
                    <SubmitButton variant="secondary">Marquer « à relire »</SubmitButton>
                  </form>
                )}
                {row.status !== "archived" && (
                  <form action={archiveArticle}>
                    <input type="hidden" name="id" value={row.id} />
                    <SubmitButton variant="secondary" confirm="Archiver cet article ?">
                      Archiver
                    </SubmitButton>
                  </form>
                )}
                {row.status !== "published" && (
                  <form action={deleteArticle}>
                    <input type="hidden" name="id" value={row.id} />
                    <SubmitButton variant="danger" confirm="Supprimer définitivement cet article ?">
                      Supprimer
                    </SubmitButton>
                  </form>
                )}
              </div>
            </Card>
          )}

          {a && audit && (
            <Card title="Analyse SEO">
              <div className="flex items-center gap-4">
                <ScoreRing score={audit.score} size={96} />
                <p className="text-sm text-brun/65">
                  {audit.words} mots · {a.readingMinutes} min de lecture
                </p>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {audit.checks.map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[c.severity]}`} />
                    <span>
                      <span className="font-medium">{c.label}</span>{" "}
                      <span className="text-brun/60">{c.detail}</span>
                    </span>
                  </li>
                ))}
                <li className="flex gap-2">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.faq?.length ? "bg-emerald-600" : "bg-champagne"}`}
                  />
                  <span>
                    <span className="font-medium">Questions fréquentes</span>{" "}
                    <span className="text-brun/60">
                      {a.faq?.length
                        ? `${a.faq.length} question(s).`
                        : "Aucune : 2 ou 3 aident les recherches en question."}
                    </span>
                  </span>
                </li>
              </ul>
              <div className="mt-5 border border-brun/10 bg-white p-3 font-sans">
                <p className="truncate text-xs text-[#4d5156]">
                  {new URL(siteUrl).hostname} › journal › {a.slug}
                </p>
                <p className="mt-1 text-base leading-snug text-[#1a0dab]">
                  {cut(withSuffix(a.title), 62)}
                </p>
                <p className="mt-1 text-xs leading-snug text-[#4d5156]">
                  {cut(a.description, 158)}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
