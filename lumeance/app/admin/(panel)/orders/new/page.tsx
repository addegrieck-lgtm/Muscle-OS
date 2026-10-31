import { Card, Field, Flash, PageTitle, flashFrom, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createManualOrder } from "../actions";

export const metadata = { title: "Commande manuelle" };

export default async function NewOrder({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, reference, price, status, product_variants(id, name, price_adjustment, active)",
    )
    .neq("status", "archived")
    .order("name");
  const options = (products ?? []).flatMap((p) => {
    const variants = (
      p.product_variants as {
        id: string;
        name: string;
        price_adjustment: number;
        active: boolean;
      }[]
    ).filter((v) => v.active);
    return variants.length
      ? variants.map((v) => ({
          value: `${p.id}:${v.id}`,
          label: `${p.name} — ${v.name} (${formatPrice(Number(p.price) + Number(v.price_adjustment))})`,
        }))
      : [{ value: p.id, label: `${p.name} — ${p.reference} (${formatPrice(Number(p.price))})` }];
  });
  return (
    <>
      <PageTitle
        title="Commande manuelle"
        subtitle="Créée en brouillon. Les prix sont relus dans le catalogue au moment de l’enregistrement."
      />
      <Flash {...flashFrom(await searchParams)} />
      <form action={createManualOrder} className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Produits">
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="grid grid-cols-[1fr_6rem] gap-2">
                  <select
                    name="line_item"
                    defaultValue=""
                    className={inputClass}
                    aria-label={`Produit ${i + 1}`}
                  >
                    <option value="">—</option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    name="line_qty"
                    type="number"
                    min={0}
                    max={99}
                    defaultValue={i === 0 ? 1 : 0}
                    className={inputClass}
                    aria-label={`Quantité ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </Card>
          <Card title="Client et adresse">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="E-mail">
                <input name="email" type="email" required className={inputClass} />
              </Field>
              <Field label="Téléphone">
                <input name="phone" className={inputClass} />
              </Field>
              <Field label="Prénom">
                <input name="first_name" required className={inputClass} />
              </Field>
              <Field label="Nom">
                <input name="last_name" required className={inputClass} />
              </Field>
              <Field label="Adresse" className="md:col-span-2">
                <input name="address_line_1" required className={inputClass} />
              </Field>
              <Field label="Complément" className="md:col-span-2">
                <input name="address_line_2" className={inputClass} />
              </Field>
              <Field label="Code postal">
                <input name="postal_code" required className={inputClass} />
              </Field>
              <Field label="Ville">
                <input name="city" required className={inputClass} />
              </Field>
              <Field label="Pays (code ISO)">
                <input name="country" defaultValue="FR" maxLength={2} className={inputClass} />
              </Field>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Montants">
            <div className="space-y-3">
              <Field label="Livraison (€)">
                <input name="shipping_amount" defaultValue="0" className={inputClass} />
              </Field>
              <Field label="Remise (€)">
                <input name="discount_amount" defaultValue="0" className={inputClass} />
              </Field>
              <Field label="Notes internes">
                <textarea name="admin_notes" rows={4} className={inputClass} />
              </Field>
            </div>
          </Card>
          <SubmitButton>Créer la commande</SubmitButton>
        </div>
      </form>
    </>
  );
}
