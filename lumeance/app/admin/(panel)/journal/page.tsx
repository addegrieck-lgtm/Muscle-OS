import Link from "next/link";
import { Badge, BtnLink, Card, Flash, PageTitle, Table, flashFrom } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { ALL_ARTICLES, formatArticleDate } from "@/lib/content/journal";
import type { ArticleRow } from "@/lib/content/journal-db";
import { PROPOSALS } from "@/lib/content/journal-propositions";
import { displayStatus } from "@/lib/content/journal-status";
import { ARTICLE_COLUMNS } from "@/lib/services/journal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { importCodeArticles, importProposals } from "./actions";

export const metadata = { title: "Studio éditorial" };

const FILTERS = [
  ["tout", "Tout"],
  ["review", "À relire"],
  ["draft", "Brouillons"],
  ["scheduled", "Programmés"],
  ["published", "En ligne"],
  ["archived", "Archivés"],
] as const;

export default async function JournalStudio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin(CATALOG_ROLES);
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("journal_articles")
    .select(ARTICLE_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: true });
  const rows = (data as ArticleRow[] | null) ?? [];
  const inStudio = new Set(rows.map((r) => r.slug));
  const codeOnly = ALL_ARTICLES.filter((a) => !inStudio.has(a.slug));
  const newProposals = PROPOSALS.filter((a) => !inStudio.has(a.slug));
  const filter = FILTERS.some(([k]) => k === sp.statut) ? sp.statut! : "tout";
  const list = rows
    .map((r) => ({ r, s: displayStatus(r.status, r.published_at) }))
    .filter(({ s }) => filter === "tout" || s.key === filter);
  const counts = Object.fromEntries(
    FILTERS.map(([k]) => [
      k,
      k === "tout"
        ? rows.length
        : rows.filter((r) => displayStatus(r.status, r.published_at).key === k).length,
    ]),
  );

  return (
    <>
      <PageTitle
        title="Studio éditorial"
        subtitle="Rédiger, relire, programmer les articles du journal. Rien ne paraît sans votre validation."
        actions={
          <BtnLink href="/admin/journal/nouveau" variant="primary">
            Nouvel article
          </BtnLink>
        }
      />
      <Flash {...flashFrom(sp)} />
      {error && (
        <Flash error="Le studio n’est pas encore installé : exécutez la migration 20261109000100_journal.sql dans Supabase." />
      )}

      {!error && (codeOnly.length > 0 || newProposals.length > 0) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {codeOnly.length > 0 && (
            <Card title={`${codeOnly.length} article(s) encore dans le code`}>
              <p className="text-sm text-brun/70">
                Ils sont déjà en ligne ou programmés. Les reprendre dans le studio permet de les
                modifier, les dépublier ou changer leur date, sans toucher au code. Dates et
                contenus sont conservés.
              </p>
              <form action={importCodeArticles} className="mt-4">
                <SubmitButton variant="secondary">Reprendre dans le studio</SubmitButton>
              </form>
            </Card>
          )}
          {newProposals.length > 0 && (
            <Card title={`${newProposals.length} proposition(s) de la rédaction`}>
              <ul className="list-disc space-y-1 pl-5 text-sm text-brun/75">
                {newProposals.map((a) => (
                  <li key={a.slug}>{a.title}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-brun/55">
                Ajoutées en « à relire » : rien n’est publié sans votre validation.
              </p>
              <form action={importProposals} className="mt-4">
                <SubmitButton variant="secondary">Ajouter au studio</SubmitButton>
              </form>
            </Card>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1">
        {FILTERS.map(([k, label]) => (
          <Link
            key={k}
            href={k === "tout" ? "/admin/journal" : `/admin/journal?statut=${k}`}
            className={`px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${k === filter ? "bg-brun text-ivoire" : "border border-brun/15"}`}
          >
            {label} ({counts[k]})
          </Link>
        ))}
      </div>
      <Table
        head={["Article", "Rubrique", "Statut", "Mise en ligne", ""]}
        empty={list.length ? undefined : "Aucun article ici."}
      >
        {list.map(({ r, s }) => (
          <tr key={r.id}>
            <td className="px-4 py-3">
              <Link href={`/admin/journal/${r.id}`} className="font-medium hover:underline">
                {r.title}
              </Link>
              <span className="block text-xs text-brun/50">/journal/{r.slug}</span>
            </td>
            <td className="px-4 py-3 text-brun/70">{r.category}</td>
            <td className="px-4 py-3">
              <Badge value={s.key} label={s.label} />
            </td>
            <td className="px-4 py-3 text-brun/70">
              {r.published_at && r.status === "published" ? formatArticleDate(r.published_at) : "—"}
            </td>
            <td className="px-4 py-3 text-right">
              <Link
                href={`/admin/journal/${r.id}`}
                className="text-xs underline underline-offset-4"
              >
                Ouvrir
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
