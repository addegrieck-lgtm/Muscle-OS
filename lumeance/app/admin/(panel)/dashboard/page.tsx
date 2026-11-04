import Link from "next/link";
import { AreaChart, KpiCard, Rise, ScoreRing } from "@/components/admin/motion";
import { Badge, Card, Flash, PageTitle, Table } from "@/components/admin/ui";
import { auditSite } from "@/lib/seo/audit";
import { sitePages } from "@/lib/seo/site-pages";
import { getCategories, getProducts } from "@/lib/services/catalog";
import { listPublishedArticles } from "@/lib/services/journal";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/services/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/validation/schemas";

export const metadata = { title: "Tableau de bord" };

interface Stats {
  orders_total: number;
  orders_pending: number;
  orders_preparing: number;
  orders_shipped: number;
  revenue_collected: number;
  paid_orders: number;
  products_available: number;
  low_stock: number;
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [
    { data: stats, error },
    { data: latest },
    { data: low },
    { data: traffic },
    products,
    categories,
  ] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase
      .from("orders")
      .select("id, order_number, status, payment_status, total, created_at, customers(email)")
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("products")
      .select("id, name, reference, stock_quantity")
      .eq("status", "published")
      .lte("stock_quantity", 2)
      .order("stock_quantity")
      .limit(8),
    supabase.rpc("admin_traffic_stats", { p_days: 7 }),
    getProducts(),
    getCategories(),
  ]);
  const seo = auditSite(sitePages(products, categories, await listPublishedArticles()));
  const t = traffic as {
    views: number;
    visitors: number;
    prev_views: number;
    prev_visitors: number;
    daily: { day: string; views: number; visitors: number }[];
  } | null;
  const s = (stats ?? {}) as Stats;
  // Panier moyen calculé uniquement sur les commandes au paiement confirmé.
  const avg = s.paid_orders ? Math.round(Number(s.revenue_collected) / s.paid_orders) : 0;

  return (
    <>
      <PageTitle title="Tableau de bord" subtitle="Vue d’ensemble de l’activité" />
      <Flash
        error={
          sp.refus
            ? "Cette section n’est pas accessible avec votre rôle."
            : error
              ? "Statistiques indisponibles."
              : undefined
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_auto]">
        <Rise>
          <Card
            title="Fréquentation — 7 derniers jours"
            actions={
              <Link href="/admin/stats" className="text-xs underline underline-offset-4">
                Statistiques détaillées
              </Link>
            }
          >
            {t ? (
              <>
                <div className="mb-4 grid gap-4 sm:grid-cols-2">
                  <KpiCard label="Pages vues" value={t.views} previous={t.prev_views} />
                  <KpiCard
                    label="Visiteurs"
                    value={t.visitors}
                    previous={t.prev_visitors}
                    delay={120}
                  />
                </div>
                <AreaChart
                  points={t.daily.map((d) => ({
                    label: new Date(`${d.day}T12:00:00`).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                    }),
                    value: d.views,
                    secondary: d.visitors,
                  }))}
                />
              </>
            ) : (
              <p className="text-sm text-brun/60">
                Mesure d’audience à activer : collez la migration{" "}
                <code>20261105000100_page_views.sql</code> dans Supabase.
              </p>
            )}
          </Card>
        </Rise>
        <Rise delay={150}>
          <Card title="Référencement" className="flex h-full flex-col items-center text-center">
            <ScoreRing score={seo.score} size={150} label="Score SEO" />
            <p className="mt-3 text-sm text-brun/65">
              {seo.errors} erreur(s) · {seo.issues.length - seo.errors} amélioration(s)
            </p>
            <Link href="/admin/seo" className="mt-3 text-xs underline underline-offset-4">
              Voir l’audit
            </Link>
          </Card>
        </Rise>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Commandes (hors brouillons)" value={Number(s.orders_total ?? 0)} />
        <KpiCard label="En attente de paiement" value={Number(s.orders_pending ?? 0)} delay={80} />
        <KpiCard label="En préparation" value={Number(s.orders_preparing ?? 0)} delay={160} />
        <KpiCard label="Expédiées" value={Number(s.orders_shipped ?? 0)} delay={240} />
        <KpiCard
          label="Chiffre d’affaires encaissé"
          value={Number(s.revenue_collected ?? 0)}
          format="euro"
          delay={320}
        />
        <KpiCard label="Panier moyen (commandes payées)" value={avg} format="euro" delay={400} />
        <KpiCard
          label="Produits disponibles"
          value={Number(s.products_available ?? 0)}
          delay={480}
        />
        <KpiCard label="Stocks faibles (≤ 2)" value={Number(s.low_stock ?? 0)} delay={560} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <h2 className="mb-3 font-serif text-xl">Dernières commandes</h2>
          <Table
            head={["Numéro", "Client", "Statut", "Paiement", "Total", "Date"]}
            empty={latest?.length ? undefined : "Aucune commande."}
          >
            {(latest ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-creme/40">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {o.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {(o.customers as unknown as { email: string } | null)?.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge value={o.status} label={ORDER_STATUS_LABELS[o.status as OrderStatus]} />
                </td>
                <td className="px-4 py-3">
                  <Badge
                    value={o.payment_status}
                    label={PAYMENT_STATUS_LABELS[o.payment_status as PaymentStatus]}
                  />
                </td>
                <td className="px-4 py-3">{formatPrice(Number(o.total))}</td>
                <td className="px-4 py-3 text-brun/60">
                  {new Date(o.created_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </Table>
        </div>
        <Card title="Stocks faibles">
          {low?.length ? (
            <ul className="divide-y divide-brun/5 text-sm">
              {low.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <Link href={`/admin/products/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                  <span className={p.stock_quantity === 0 ? "text-[#8a3b2a]" : ""}>
                    {p.stock_quantity}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brun/50">Aucun stock faible.</p>
          )}
        </Card>
      </div>
    </>
  );
}
