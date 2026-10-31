import Link from "next/link";
import { BtnLink, PageTitle, Table, inputClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Clients" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("customers")
    .select("id, email, first_name, last_name, created_at, orders(total, payment_status)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.q) {
    const term = sp.q
      .replace(/[%,()]/g, " ")
      .trim()
      .slice(0, 60);
    q = q.or(`email.ilike.%${term}%,last_name.ilike.%${term}%,first_name.ilike.%${term}%`);
  }
  const { data } = await q;
  return (
    <>
      <PageTitle
        title="Clients"
        subtitle={`${data?.length ?? 0} client(s)`}
        actions={
          session.role !== "order_manager" ? (
            <BtnLink href="/api/admin/customers/export">Exporter en CSV</BtnLink>
          ) : undefined
        }
      />
      <form className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Nom ou e-mail"
          className={`${inputClass} max-w-xs`}
        />
        <button className="border border-brun/20 px-4 text-xs uppercase tracking-[0.14em]">
          Rechercher
        </button>
      </form>
      <Table
        head={["Client", "E-mail", "Commandes", "Total payé", "Depuis"]}
        empty={data?.length ? undefined : "Aucun client."}
      >
        {(data ?? []).map((c) => {
          const orders = c.orders as { total: number; payment_status: string }[];
          const paid = orders
            .filter((o) => o.payment_status === "paid" || o.payment_status === "partially_refunded")
            .reduce((s, o) => s + Number(o.total), 0);
          return (
            <tr key={c.id} className="hover:bg-creme/40">
              <td className="px-4 py-3">
                <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                </Link>
              </td>
              <td className="px-4 py-3">{c.email}</td>
              <td className="px-4 py-3">{orders.length}</td>
              <td className="px-4 py-3">{formatPrice(paid)}</td>
              <td className="px-4 py-3 text-brun/60">
                {new Date(c.created_at).toLocaleDateString("fr-FR")}
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
