import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageTitle, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/services/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/validation/schemas";

export const metadata = { title: "Client" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data: c }, { data: addresses }, { data: orders }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("customer_addresses").select("*").eq("customer_id", id),
    supabase
      .from("orders")
      .select("id, order_number, status, payment_status, total, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!c) notFound();
  const paid = (orders ?? [])
    .filter((o) => ["paid", "partially_refunded"].includes(o.payment_status))
    .reduce((s, o) => s + Number(o.total), 0);
  return (
    <>
      <PageTitle
        title={[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}
        subtitle={`Client depuis le ${new Date(c.created_at).toLocaleDateString("fr-FR")}`}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Table
            head={["Commande", "Statut", "Paiement", "Total", "Date"]}
            empty={orders?.length ? undefined : "Aucune commande."}
          >
            {(orders ?? []).map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                    {o.order_number}
                  </Link>
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
        <div className="space-y-6">
          <Card title="Coordonnées">
            <p className="text-sm leading-6">
              <a href={`mailto:${c.email}`}>{c.email}</a>
              <br />
              {c.phone ?? "Téléphone non renseigné"}
            </p>
            <p className="mt-4 text-sm">
              {orders?.length ?? 0} commande(s) · {formatPrice(paid)} payés
            </p>
          </Card>
          <Card title="Adresses">
            <ul className="space-y-4 text-sm">
              {(addresses ?? []).map((a) => (
                <li key={a.id}>
                  <span className="text-xs uppercase text-brun/50">
                    {a.address_type === "billing" ? "Facturation" : "Livraison"}
                  </span>
                  <br />
                  {a.address_line_1}, {a.postal_code} {a.city} ({a.country})
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
