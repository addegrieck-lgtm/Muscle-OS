import Link from "next/link";
import { Badge, Card, Flash, PageTitle, Stat, Table } from "@/components/admin/ui";
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
  const [{ data: stats, error }, { data: latest }, { data: low }] = await Promise.all([
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
  ]);
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Commandes" value={s.orders_total ?? 0} hint="Hors brouillons" />
        <Stat label="En attente de paiement" value={s.orders_pending ?? 0} />
        <Stat label="En préparation" value={s.orders_preparing ?? 0} />
        <Stat label="Expédiées" value={s.orders_shipped ?? 0} />
        <Stat
          label="Chiffre d’affaires encaissé"
          value={formatPrice(Number(s.revenue_collected ?? 0))}
          hint="Paiements confirmés uniquement, remboursements déduits"
        />
        <Stat label="Panier moyen" value={formatPrice(avg)} hint="Sur les commandes payées" />
        <Stat
          label="Produits disponibles"
          value={s.products_available ?? 0}
          hint="Publiés et en stock"
        />
        <Stat label="Stocks faibles" value={s.low_stock ?? 0} hint="≤ 2 unités" />
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
