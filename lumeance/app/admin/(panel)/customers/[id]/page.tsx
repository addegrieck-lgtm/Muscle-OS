import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Flash, PageTitle, Table, flashFrom } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { circleLevel } from "@/lib/catalog/loyalty";
import { setProStatus } from "../actions";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/services/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/validation/schemas";

export const metadata = { title: "Client" };

const PRO_LABELS = {
  pending: "À valider",
  approved: "Validé",
  rejected: "Refusé",
  none: "—",
} as const;

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const [{ data: c }, { data: addresses }, { data: orders }, { data: account }] = await Promise.all(
    [
      supabase.from("customers").select("*").eq("id", id).maybeSingle(),
      supabase.from("customer_addresses").select("*").eq("customer_id", id),
      supabase
        .from("orders")
        .select("id, order_number, status, payment_status, total, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("customer_accounts")
        .select(
          "account_type, company_name, siret, vat_number, pro_status, pro_reviewed_at, referral_code, referred_by, created_at, referral_credits(amount, used_at)",
        )
        .eq("customer_id", id)
        .maybeSingle(),
    ],
  );
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
      <Flash {...flashFrom(await searchParams)} />
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
          {account && (
            <Card
              title={
                account.account_type === "entreprise" ? "Compte entreprise" : "Compte en ligne"
              }
            >
              {account.account_type === "entreprise" ? (
                <div className="space-y-3 text-sm">
                  <p>
                    <strong>{account.company_name}</strong>
                    <br />
                    SIRET{" "}
                    <a
                      href={`https://annuaire-entreprises.data.gouv.fr/etablissement/${account.siret}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {account.siret}
                    </a>
                    {account.vat_number ? ` · TVA ${account.vat_number}` : ""}
                  </p>
                  <p>
                    Statut :{" "}
                    <Badge
                      value={account.pro_status}
                      label={PRO_LABELS[account.pro_status as keyof typeof PRO_LABELS]}
                    />
                  </p>
                  <p className="text-xs text-brun/60">
                    Vérifiez l’entreprise sur l’annuaire officiel (lien du SIRET) avant de valider.
                  </p>
                  {session.role !== "order_manager" && (
                    <div className="flex flex-wrap gap-2">
                      {account.pro_status !== "approved" && (
                        <form action={setProStatus}>
                          <input type="hidden" name="customerId" value={id} />
                          <input type="hidden" name="status" value="approved" />
                          <SubmitButton variant="primary">Valider</SubmitButton>
                        </form>
                      )}
                      {account.pro_status !== "rejected" && (
                        <form action={setProStatus}>
                          <input type="hidden" name="customerId" value={id} />
                          <input type="hidden" name="status" value="rejected" />
                          <SubmitButton variant="secondary">Refuser</SubmitButton>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p>
                    Cercle : {circleLevel(paid)?.name ?? "aucun niveau"} ({formatPrice(paid)}{" "}
                    cumulés)
                  </p>
                  <p>Code de parrainage : {account.referral_code}</p>
                  {account.referred_by && <p>Parrainé à l’inscription.</p>}
                  {(account.referral_credits as { amount: number; used_at: string | null }[])
                    .length > 0 && (
                    <p>
                      Avoirs :{" "}
                      {(account.referral_credits as { amount: number; used_at: string | null }[])
                        .map(
                          (r) => `${formatPrice(Number(r.amount))}${r.used_at ? " (utilisé)" : ""}`,
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>
              )}
            </Card>
          )}
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
