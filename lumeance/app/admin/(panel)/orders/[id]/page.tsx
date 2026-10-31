import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Badge,
  Card,
  Field,
  Flash,
  PageTitle,
  Table,
  flashFrom,
  inputClass,
} from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/admin";
import { centsToInput, formatPrice } from "@/lib/money";
import {
  allowedTransitions,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/services/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/validation/schemas";
import { changeOrderStatus, recordManualPayment, saveAdminNotes } from "../actions";

export const metadata = { title: "Commande" };

type Addr = {
  first_name: string;
  last_name: string;
  address_line_1: string;
  address_line_2?: string | null;
  postal_code: string;
  city: string;
  country: string;
} | null;

function Address({ a }: { a: Addr }) {
  if (!a) return <p className="text-sm text-brun/50">—</p>;
  return (
    <address className="text-sm not-italic leading-6">
      {a.first_name} {a.last_name}
      <br />
      {a.address_line_1}
      {a.address_line_2 && (
        <>
          <br />
          {a.address_line_2}
        </>
      )}
      <br />
      {a.postal_code} {a.city}
      <br />
      {a.country}
    </address>
  );
}

export default async function OrderPage({
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
  const [{ data: o }, { data: items }, { data: history }, { data: payments }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, customers(id, email, first_name, last_name, phone)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
    supabase.from("payment_transactions").select("*").eq("order_id", id).order("created_at"),
  ]);
  if (!o) notFound();
  const c = o.customers as {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
  const next = allowedTransitions(o.status as OrderStatus, o.payment_status as PaymentStatus);
  const canRecordPayment =
    session.role !== "order_manager" && ["unpaid", "pending", "failed"].includes(o.payment_status);

  return (
    <>
      <PageTitle
        title={o.order_number}
        subtitle={`Créée le ${new Date(o.created_at).toLocaleString("fr-FR")}`}
        actions={
          <>
            <Badge value={o.status} label={ORDER_STATUS_LABELS[o.status as OrderStatus]} />
            <Badge
              value={o.payment_status}
              label={PAYMENT_STATUS_LABELS[o.payment_status as PaymentStatus]}
            />
          </>
        }
      />
      <Flash {...flashFrom(await searchParams)} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Table head={["Produit", "Réf.", "Prix unitaire", "Qté", "Total"]}>
            {(items ?? []).map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  {i.product_name_snapshot}
                  {i.variant_snapshot && (
                    <span className="block text-xs text-brun/50">
                      {(i.variant_snapshot as { name: string }).name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-brun/60">{i.product_reference_snapshot}</td>
                <td className="px-4 py-3">{formatPrice(Number(i.unit_price))}</td>
                <td className="px-4 py-3">{i.quantity}</td>
                <td className="px-4 py-3">{formatPrice(Number(i.total))}</td>
              </tr>
            ))}
          </Table>
          <Card title="Montants">
            <dl className="grid max-w-sm grid-cols-2 gap-y-2 text-sm">
              <dt>Sous-total</dt>
              <dd className="text-right">{formatPrice(Number(o.subtotal))}</dd>
              <dt>Livraison</dt>
              <dd className="text-right">{formatPrice(Number(o.shipping_amount))}</dd>
              <dt>Remise</dt>
              <dd className="text-right">− {formatPrice(Number(o.discount_amount))}</dd>
              <dt className="font-medium">Total</dt>
              <dd className="text-right font-medium">{formatPrice(Number(o.total))}</dd>
            </dl>
          </Card>
          <Card title="Historique">
            <ol className="space-y-3 text-sm">
              {(history ?? []).map((h) => (
                <li key={h.id} className="border-l border-champagne pl-3">
                  <span className="text-brun/50">
                    {new Date(h.created_at).toLocaleString("fr-FR")}
                  </span>{" "}
                  —{" "}
                  {h.previous_status
                    ? `${ORDER_STATUS_LABELS[h.previous_status as OrderStatus]} → `
                    : ""}
                  <strong>{ORDER_STATUS_LABELS[h.new_status as OrderStatus]}</strong>
                  {h.note && <span className="block text-brun/70">{h.note}</span>}
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Paiements">
            {payments?.length ? (
              <ul className="space-y-2 text-sm">
                {payments.map((p) => (
                  <li key={p.id}>
                    {new Date(p.created_at).toLocaleString("fr-FR")} —{" "}
                    {p.kind === "refund" ? "Remboursement" : "Paiement"} {p.provider} —{" "}
                    {formatPrice(Number(p.amount))} — {p.status}{" "}
                    {p.provider_reference && (
                      <span className="text-brun/50">({p.provider_reference})</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-brun/50">
                Aucun paiement enregistré. Le paiement en ligne n’est pas activé.
              </p>
            )}
            {canRecordPayment && (
              <form
                action={recordManualPayment}
                className="mt-5 grid gap-3 border-t border-brun/10 pt-5 md:grid-cols-3"
              >
                <input type="hidden" name="orderId" value={id} />
                <Field label="Montant reçu (€)">
                  <input
                    name="amount"
                    required
                    defaultValue={centsToInput(Number(o.total))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Référence (virement…)">
                  <input name="reference" required minLength={3} className={inputClass} />
                </Field>
                <Field label="Note">
                  <input name="note" className={inputClass} />
                </Field>
                <div className="md:col-span-3">
                  <SubmitButton
                    variant="secondary"
                    confirm="Confirmer que ce paiement a bien été reçu sur le compte de l’entreprise ?"
                  >
                    Enregistrer un paiement reçu
                  </SubmitButton>
                  <p className="mt-2 text-xs text-brun/50">
                    À n’utiliser qu’après réception effective des fonds. L’action est journalisée.
                  </p>
                </div>
              </form>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Statut">
            {next.length ? (
              <form action={changeOrderStatus} className="space-y-3">
                <input type="hidden" name="orderId" value={id} />
                <Field label="Nouveau statut">
                  <select name="status" className={inputClass}>
                    {next.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Note (historique)">
                  <input name="note" maxLength={500} className={inputClass} />
                </Field>
                <SubmitButton>Mettre à jour</SubmitButton>
              </form>
            ) : (
              <p className="text-sm text-brun/60">Aucun changement de statut possible.</p>
            )}
            {["draft", "pending_payment"].includes(o.status) && o.payment_status !== "paid" && (
              <p className="mt-3 text-xs text-brun/50">
                « Payée » ne peut être atteint qu’après un paiement confirmé.
              </p>
            )}
          </Card>
          <Card title="Client">
            {c ? (
              <div className="text-sm leading-6">
                <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}
                </Link>
                <br />
                <a href={`mailto:${c.email}`}>{c.email}</a>
                {c.phone && (
                  <>
                    <br />
                    {c.phone}
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-brun/50">—</p>
            )}
          </Card>
          <Card title="Livraison">
            <Address a={o.shipping_address_snapshot as Addr} />
          </Card>
          <Card title="Facturation">
            <Address a={o.billing_address_snapshot as Addr} />
          </Card>
          <Card title="Notes internes">
            <form action={saveAdminNotes} className="space-y-3">
              <input type="hidden" name="orderId" value={id} />
              <textarea
                name="admin_notes"
                rows={5}
                defaultValue={o.admin_notes ?? ""}
                className={inputClass}
                aria-label="Notes internes"
              />
              <SubmitButton variant="secondary">Enregistrer</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
