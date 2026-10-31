import Link from "next/link";
import {
  Badge,
  BtnLink,
  Flash,
  PageTitle,
  Table,
  flashFrom,
  inputClass,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/services/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/validation/schemas";

export const metadata = { title: "Commandes" };
const PAGE = 50;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, total, created_at, customers!inner(email, first_name, last_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (ORDER_STATUSES.includes(sp.statut as OrderStatus)) q = q.eq("status", sp.statut);
  if (PAYMENT_STATUSES.includes(sp.paiement as PaymentStatus))
    q = q.eq("payment_status", sp.paiement);
  if (sp.q) {
    const term = sp.q
      .replace(/[%,()]/g, " ")
      .trim()
      .slice(0, 60);
    q = term.toUpperCase().startsWith("LUM-")
      ? q.ilike("order_number", `%${term}%`)
      : q.ilike("customers.email", `%${term}%`);
  }
  const { data, count } = await q;
  const qs = new URLSearchParams(
    Object.entries(sp).filter(([k]) => k !== "page" && k !== "ok" && k !== "erreur"),
  );
  return (
    <>
      <PageTitle
        title="Commandes"
        subtitle={`${count ?? 0} commande(s)`}
        actions={
          <>
            <BtnLink href={`/api/admin/orders/export?${qs}`}>Exporter en CSV</BtnLink>
            <BtnLink href="/admin/orders/new" variant="primary">
              Commande manuelle
            </BtnLink>
          </>
        }
      />
      <Flash {...flashFrom(sp)} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="N° LUM-… ou e-mail"
          className={`${inputClass} max-w-xs`}
        />
        <select
          name="statut"
          defaultValue={sp.statut ?? ""}
          className={`${inputClass} max-w-[14rem]`}
        >
          <option value="">Tous les statuts</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          name="paiement"
          defaultValue={sp.paiement ?? ""}
          className={`${inputClass} max-w-[14rem]`}
        >
          <option value="">Tous les paiements</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button className="border border-brun/20 px-4 text-xs uppercase tracking-[0.14em]">
          Filtrer
        </button>
      </form>
      <Table
        head={["Numéro", "Client", "Statut", "Paiement", "Total", "Date"]}
        empty={data?.length ? undefined : "Aucune commande."}
      >
        {(data ?? []).map((o) => {
          const c = o.customers as unknown as {
            email: string;
            first_name: string | null;
            last_name: string | null;
          };
          return (
            <tr key={o.id} className="hover:bg-creme/40">
              <td className="px-4 py-3">
                <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                  {o.order_number}
                </Link>
              </td>
              <td className="px-4 py-3">
                {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                <span className="block text-xs text-brun/50">{c.email}</span>
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
                {new Date(o.created_at).toLocaleString("fr-FR")}
              </td>
            </tr>
          );
        })}
      </Table>
      <div className="mt-4 flex gap-3 text-sm">
        {page > 1 && <Link href={`?${qs}&page=${page - 1}`}>← Précédent</Link>}
        {(count ?? 0) > page * PAGE && <Link href={`?${qs}&page=${page + 1}`}>Suivant →</Link>}
      </div>
    </>
  );
}
