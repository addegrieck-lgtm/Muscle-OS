import Link from "next/link";
import { KpiCard, Rise, ScoreRing } from "@/components/admin/motion";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { publicEnv, siteUrl } from "@/lib/env";
import { auditSite, type PageAudit, type Severity } from "@/lib/seo/audit";
import { sitePages } from "@/lib/seo/site-pages";
import { getCategories, getProducts } from "@/lib/services/catalog";
import { listPublishedArticles } from "@/lib/services/journal";

export const metadata = { title: "Référencement (SEO)" };

const DOT: Record<Severity, string> = {
  ok: "bg-emerald-600",
  warn: "bg-champagne",
  error: "bg-red-700",
};
const KINDS = ["tout", "produit", "catégorie", "article", "page", "accueil"] as const;

/** Aperçu du résultat Google (titre coupé vers 60 caractères, description vers 155). */
function Snippet({ a }: { a: PageAudit }) {
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  return (
    <div className="max-w-xl border border-brun/10 bg-white p-4 font-sans">
      <p className="truncate text-xs text-[#4d5156]">
        {new URL(siteUrl).hostname} › {a.path.split("/").filter(Boolean).join(" › ")}
      </p>
      <p className="mt-1 text-lg leading-snug text-[#1a0dab]">{cut(a.title, 62)}</p>
      <p className="mt-1 text-sm leading-snug text-[#4d5156]">{cut(a.description || "—", 158)}</p>
    </div>
  );
}

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const kind = KINDS.includes(sp.type as (typeof KINDS)[number]) ? sp.type! : "tout";
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const { audits, score, issues, errors } = auditSite(
    sitePages(products, categories, await listPublishedArticles()),
  );
  const list = kind === "tout" ? audits : audits.filter((a) => a.kind === kind);
  const words = audits.reduce((s, a) => s + a.words, 0);
  const top = issues
    .filter((i) => i.check.severity === "error")
    .concat(issues.filter((i) => i.check.severity === "warn"))
    .slice(0, 8);

  const tech: { label: string; ok: boolean; detail: string }[] = [
    {
      label: "Plan du site (sitemap.xml)",
      ok: true,
      detail: `${audits.length} pages déclarées, mises à jour automatiquement.`,
    },
    { label: "Fichier robots.txt", ok: true, detail: "Administration et API exclues." },
    {
      label: "Adresses canoniques",
      ok: true,
      detail: "Une adresse de référence par page ; pages filtrées non indexées.",
    },
    {
      label: "Données structurées",
      ok: true,
      detail: "Organisation, fil d’Ariane, produits (prix, disponibilité), articles.",
    },
    {
      label: "Images optimisées",
      ok: true,
      detail: "Formats modernes (WebP/AVIF), tailles adaptées à l’écran.",
    },
    {
      label: "Mobile",
      ok: true,
      detail: "Toutes les pages sont conçues d’abord pour le téléphone.",
    },
    {
      label: "Ouverture aux moteurs",
      ok: publicEnv.NEXT_PUBLIC_INDEXABLE,
      detail: publicEnv.NEXT_PUBLIC_INDEXABLE
        ? "Le site est ouvert aux moteurs de recherche."
        : "Prévue à l’ouverture de la boutique.",
    },
  ];

  return (
    <>
      <PageTitle
        title="Référencement (SEO)"
        subtitle="Audit de toutes les pages publiques, recalculé à chaque visite"
      />

      <div className="grid gap-6 xl:grid-cols-[auto_1fr]">
        <Rise>
          <Card className="flex h-full flex-col items-center justify-center text-center">
            <ScoreRing score={score} size={168} label="Score global" />
            <p className="mt-4 max-w-[16rem] text-sm text-brun/65">
              {score >= 80
                ? "Très bonne base : peaufinez les quelques points restants."
                : score >= 55
                  ? "Base correcte : quelques corrections feront la différence."
                  : "Des corrections importantes sont à prévoir."}
            </p>
          </Card>
        </Rise>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Pages analysées" value={audits.length} />
          <KpiCard label="Erreurs" value={errors} delay={120} />
          <KpiCard label="Améliorations" value={issues.length - errors} delay={240} />
          <KpiCard label="Mots publiés" value={words} delay={360} />
          <Rise className="sm:col-span-2 xl:col-span-4" delay={300}>
            <Card title="À corriger en priorité">
              {top.length === 0 ? (
                <p className="text-sm text-brun/60">Rien à signaler.</p>
              ) : (
                <ul className="divide-y divide-brun/10 text-sm">
                  {top.map(({ page, check }, k) => (
                    <li
                      key={`${page.path}-${check.id}-${k}`}
                      className="flex flex-wrap items-center gap-3 py-2"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[check.severity]}`} />
                      <span className="font-medium">{page.name}</span>
                      <span className="text-brun/50">· {check.label}</span>
                      <span className="text-brun/70">{check.detail}</span>
                      {page.editHref && (
                        <Link
                          href={page.editHref}
                          className="ml-auto text-xs underline underline-offset-4"
                        >
                          Modifier
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </Rise>
        </div>
      </div>

      <Rise className="mt-6">
        <Card title="Santé technique">
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tech.map((t) => (
              <li key={t.label} className="flex gap-3 text-sm">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.ok ? "bg-emerald-600" : "bg-champagne"}`}
                />
                <span>
                  <span className="font-medium">{t.label}</span>
                  <span className="block text-brun/60">{t.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </Rise>

      <div className="mb-3 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Page par page</h2>
        <div className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <Link
              key={k}
              href={k === "tout" ? "/admin/seo" : `/admin/seo?type=${encodeURIComponent(k)}`}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${k === kind ? "bg-brun text-ivoire" : "border border-brun/15"}`}
            >
              {k}
            </Link>
          ))}
        </div>
      </div>
      <ul className="space-y-2">
        {list.map((a, k) => (
          <li key={a.path}>
            <Rise delay={Math.min(k, 12) * 40} className="border border-brun/10 bg-white/60">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-serif text-lg text-ivoire ${a.score >= 80 ? "bg-emerald-700" : a.score >= 55 ? "bg-champagne" : "bg-red-800"}`}
                  >
                    {a.score}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-brun/50">
                      {a.kind} · {a.path}
                    </span>
                  </span>
                  <span className="hidden gap-1 sm:flex">
                    {a.checks.map((c) => (
                      <span
                        key={c.id}
                        title={`${c.label} : ${c.detail}`}
                        className={`h-2 w-2 rounded-full ${DOT[c.severity]}`}
                      />
                    ))}
                  </span>
                  <span className="text-brun/40 transition-transform group-open:rotate-90">›</span>
                </summary>
                <div className="grid gap-6 border-t border-brun/10 px-4 py-4 lg:grid-cols-2">
                  <ul className="space-y-2 text-sm">
                    {a.checks.map((c) => (
                      <li key={c.id} className="flex gap-3">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[c.severity]}`}
                        />
                        <span>
                          <span className="font-medium">{c.label}</span> —{" "}
                          <span className="text-brun/70">{c.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div>
                    <p className="mb-2 text-[0.68rem] uppercase tracking-[0.14em] text-brun/55">
                      Aperçu dans Google
                    </p>
                    <Snippet a={a} />
                    {a.editHref && (
                      <Link
                        href={a.editHref}
                        className="mt-3 inline-block text-xs underline underline-offset-4"
                      >
                        Modifier la fiche
                      </Link>
                    )}
                  </div>
                </div>
              </details>
            </Rise>
          </li>
        ))}
      </ul>
    </>
  );
}
