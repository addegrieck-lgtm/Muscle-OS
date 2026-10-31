import type { NextRequest } from "next/server";
import { csvResponse } from "@/lib/admin/csv-route";
import { centsToCsv, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/services/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return csvResponse(null, "commandes", async () => {
    const sp = req.nextUrl.searchParams;
    const supabase = await createSupabaseServerClient();
    let q = supabase
      .from("orders")
      .select(
        "order_number, status, payment_status, payment_method, subtotal, shipping_amount, discount_amount, total, currency, created_at, customers(email, first_name, last_name), order_items(quantity)",
      )
      .order("created_at", { ascending: false })
      .limit(5000);
    const st = sp.get("statut");
    const pay = sp.get("paiement");
    if (st && ORDER_STATUSES.includes(st as OrderStatus)) q = q.eq("status", st);
    if (pay && PAYMENT_STATUSES.includes(pay as PaymentStatus)) q = q.eq("payment_status", pay);
    const { data } = await q;
    return {
      header: [
        "Numéro",
        "Date",
        "Client",
        "E-mail",
        "Statut",
        "Paiement",
        "Moyen",
        "Articles",
        "Sous-total",
        "Livraison",
        "Remise",
        "Total",
        "Devise",
      ],
      rows: (data ?? []).map((o) => {
        const c = o.customers as unknown as {
          email: string;
          first_name: string | null;
          last_name: string | null;
        } | null;
        return [
          o.order_number,
          new Date(o.created_at).toLocaleString("fr-FR"),
          [c?.first_name, c?.last_name].filter(Boolean).join(" "),
          c?.email ?? "",
          ORDER_STATUS_LABELS[o.status as OrderStatus],
          PAYMENT_STATUS_LABELS[o.payment_status as PaymentStatus],
          o.payment_method ?? "",
          (o.order_items as { quantity: number }[]).reduce((s, i) => s + i.quantity, 0),
          centsToCsv(Number(o.subtotal)),
          centsToCsv(Number(o.shipping_amount)),
          centsToCsv(Number(o.discount_amount)),
          centsToCsv(Number(o.total)),
          o.currency,
        ];
      }),
    };
  });
}
