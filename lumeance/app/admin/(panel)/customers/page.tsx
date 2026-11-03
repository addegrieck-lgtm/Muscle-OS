import Link from "next/link";
import { BtnLink, PageTitle, Table, inputClass } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Clients" };

type AccountRow = { account_type: string; pro_status: string; company_name: string | null };
function accountLabel(raw: unknown): string {
  const a = (Array.isArray(raw) ? raw[0] : raw) as AccountRow | null | undefined;
  if (!a) return "—";
  if (a.account_type !== "entreprise") return "Particulier";
  const s = { pending: "à valider", approved: "validé", rejected: "refusé" }[a.pro_status] ?? "";
  return `${a.company_name ?? "Entreprise"} · ${s}`;
}

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
    .select(
      `id, email, first_name, last_name, created_at, orders(total, payment_status), customer_accounts${sp.pros ? "!inner" : ""}(account_type, pro_status, company_name)`,
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.pros) q = q.eq("customer_accounts.pro_status", "pending");
  if (sp.q) {
    const term = sp.q
      .replace(/[%,()]/g, " ")
      .trim()
      .slice(0, 60);
    q = q.or(`email.ilike.%${term}%,last_name.ilike.%${term}%,first_name.ilike.%${term}%`);
  }
  const [{ data }, { count: pending }] = await Promise.all([
    q,
    supabase
      .from("customer_accounts")
      .select("auth_user_id", { count: "exact", head: true })
      .eq("pro_status", "pending"),
  ]);
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
      {(pending ?? 0) > 0 && !sp.pros && (
        <p className="mb-4 border-l-2 border-champagne bg-creme/60 px-4 py-3 text-sm">
          {pending} compte(s) entreprise à valider.{" "}
          <Link href="/admin/customers?pros=1" className="underline">
            Les voir
          </Link>
        </p>
      )}
      {sp.pros && (
        <p className="mb-4 text-sm">
          Comptes entreprise à valider ·{" "}
          <Link href="/admin/customers" className="underline">
            Tous les clients
          </Link>
        </p>
      )}
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
        head={["Client", "E-mail", "Compte", "Commandes", "Total payé", "Depuis"]}
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
              <td className="px-4 py-3">{accountLabel(c.customer_accounts)}</td>
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
