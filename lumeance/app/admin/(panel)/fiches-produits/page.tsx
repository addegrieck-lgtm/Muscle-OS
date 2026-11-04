import Link from "next/link";
import { KpiCard, Rise, ScoreRing } from "@/components/admin/motion";
import { Card, PageTitle } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { siteUrl } from "@/lib/env";
import type { Severity } from "@/lib/seo/audit";
import { articlesForProduct, roomsForProduct } from "@/lib/seo/linking";
import { auditProduct } from "@/lib/seo/product-audit";
import { getProducts } from "@/lib/services/catalog";
import { listPublishedArticles } from "@/lib/services/journal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Fiches produits (SEO)" };

const DOT: Record<Severity, string> = {
  ok: "bg-emerald-600",
  warn: "bg-champagne",
  error: "bg-red-700",
};

export default async function ProductSeoPage() {
  await requireAdmin();
  const [all, articles] = await Promise.all([getProducts(), listPublishedArticles()]);
  const products = all.filter((p) => !p.isDemo);
  const supabase = await createSupabaseServerClient();
  const { data: rv } = await supabase.from("published_reviews").select("product_id");
  const reviews = new Map<string, number>();
  for (const r of (rv as { product_id: string }[] | null) ?? [])
    reviews.set(r.product_id, (reviews.get(r.product_id) ?? 0) + 1);

  const audits = products
    .map((p) =>
      auditProduct(p, {
        articles: articlesForProduct(articles, p.slug).length,
        rooms: roomsForProduct(products, p.slug).length,
        reviews: reviews.get(p.id) ?? 0,
      }),
    )
    .sort((a, b) => a.score - b.score);
  const avg = audits.length
    ? Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length)
    : 0;
  const supplier = audits.flatMap((a) =>
    a.checks.filter((c) => c.supplier).map((c) => ({ name: a.product.name, label: c.label })),
  );
  const bySupplierItem = new Map<string, string[]>();
  for (const s of supplier)
    bySupplierItem.set(s.label, [...(bySupplierItem.get(s.label) ?? []), s.name]);

  return (
    <>
      <PageTitle
        title="Fiches produits"
        subtitle="Ce que Google trouve sur chaque fiche, et ce qu’il faut demander au fournisseur"
      />
      <div className="grid gap-6 xl:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center text-center">
          <ScoreRing score={avg} size={150} label="Score moyen" />
        </Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Fiches en ligne" value={audits.length} />
          <KpiCard
            label="Fiches à 90 ou plus"
            value={audits.filter((a) => a.score >= 90).length}
            delay={120}
          />
          <KpiCard label="Informations à demander" value={supplier.length} delay={240} />
        </div>
      </div>

      {bySupplierItem.size > 0 && (
        <Rise className="mt-6">
          <Card title="À demander au fournisseur">
            <ul className="space-y-2 text-sm">
              {[...bySupplierItem].map(([label, names]) => (
                <li key={label}>
                  <span className="font-medium">{label}</span>{" "}
                  <span className="text-brun/60">: {names.join(", ")}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-brun/55">
              Ne renseigner qu’avec une information écrite du fournisseur : aucune certification,
              indice IP, conformité ou garantie ne doit être supposée.
            </p>
          </Card>
        </Rise>
      )}

      <ul className="mt-6 space-y-2">
        {audits.map((a, k) => (
          <li key={a.product.id}>
            <Rise delay={Math.min(k, 12) * 40} className="border border-brun/10 bg-white/60">
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-serif text-lg text-ivoire ${a.score >= 85 ? "bg-emerald-700" : a.score >= 60 ? "bg-champagne" : "bg-red-800"}`}
                  >
                    {a.score}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.product.name}</span>
                    <span className="block truncate text-xs text-brun/50">
                      {a.product.reference} · {a.photos} visuel(s)
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
                </summary>
                <div className="border-t border-brun/10 px-4 py-4">
                  <ul className="grid gap-2 text-sm md:grid-cols-2">
                    {a.checks.map((c) => (
                      <li key={c.id} className="flex gap-2">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[c.severity]}`}
                        />
                        <span>
                          <span className="font-medium">{c.label}</span>{" "}
                          <span className="text-brun/60">{c.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex gap-4 text-xs">
                    <Link
                      href={`/admin/products?q=${encodeURIComponent(a.product.reference)}`}
                      className="underline underline-offset-4"
                    >
                      Modifier la fiche
                    </Link>
                    <a
                      href={`/produit/${a.product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      Voir sur le site
                    </a>
                    <a
                      href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(`${siteUrl}/produit/${a.product.slug}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      Tester dans Google
                    </a>
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
