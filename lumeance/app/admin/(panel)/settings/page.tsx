import { revalidatePath } from "next/cache";
import { z } from "zod";
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
import { CATALOG_ROLES, ROLE_LABELS, requireAdmin, type AdminRole } from "@/lib/auth/admin";
import { firstError } from "@/lib/admin/forms";
import { back, dbError } from "@/lib/admin/redirect";
import { readSetting, writeSetting } from "@/lib/admin/settings";
import { centsToInput, parseEuroInput } from "@/lib/money";
import { DEFAULT_CONTACT, DEFAULT_SHIPPING } from "@/lib/services/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  contactSettingsSchema,
  emailSchema,
  seoSettingsSchema,
  shippingSettingsSchema,
} from "@/lib/validation/schemas";
import { DEFAULT_DESCRIPTION } from "@/lib/seo/metadata";

export const metadata = { title: "Paramètres" };

async function saveSettings(form: FormData) {
  "use server";
  await requireAdmin(CATALOG_ROLES);
  const section = String(form.get("section"));
  let result;
  if (section === "shipping") {
    result = shippingSettingsSchema.safeParse({
      standardAmount: parseEuroInput(String(form.get("standardAmount") || "0")) ?? NaN,
      freeThreshold: parseEuroInput(String(form.get("freeThreshold") || "0")) ?? NaN,
      deliveryNote: form.get("deliveryNote") ?? "",
      countries: String(form.get("countries") ?? "FR")
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    });
    if (result.success) result = { ...result, key: "shop.shipping" };
  } else if (section === "contact") {
    result = contactSettingsSchema.safeParse(
      Object.fromEntries(
        ["email", "phone", "address", "legalName", "siret"].map((k) => [k, form.get(k) ?? ""]),
      ),
    );
    if (result.success) result = { ...result, key: "shop.contact" };
  } else {
    result = seoSettingsSchema.safeParse({
      title: form.get("title"),
      description: form.get("description"),
    });
    if (result.success) result = { ...result, key: "seo.default" };
  }
  if (!result.success) back("/admin/settings", { erreur: firstError(result.error.issues) });
  const { error } = await writeSetting((result as { key: string }).key, result.data, true);
  if (error) back("/admin/settings", { erreur: dbError("saveSettings", error) });
  revalidatePath("/", "layout");
  back("/admin/settings", { ok: "Paramètres enregistrés." });
}

/** Gestion des administrateurs : super administrateur uniquement. L'invitation passe par
 * l'API Auth avec la clé service_role, exclusivement côté serveur. */
async function manageAdmin(form: FormData) {
  "use server";
  const session = await requireAdmin(["super_admin"]);
  const role = z.enum(["super_admin", "admin", "order_manager"]).safeParse(form.get("role"));
  if (!role.success) back("/admin/settings", { erreur: "Rôle invalide." });
  const supabase = await createSupabaseServerClient();
  const adminId = form.get("admin_id");
  if (adminId) {
    const aid = z.string().uuid().parse(adminId);
    const { error } = await supabase
      .from("admin_users")
      .update({ role: role.data, active: form.get("active") === "on" })
      .eq("id", aid);
    if (error)
      back("/admin/settings", {
        erreur:
          error.code === "23514"
            ? "Impossible de retirer le dernier super administrateur."
            : dbError("manageAdmin", error),
      });
    back("/admin/settings", { ok: "Accès mis à jour." });
  }
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) back("/admin/settings", { erreur: "Adresse e-mail invalide." });
  const service = createSupabaseServiceClient();
  if (!service)
    back("/admin/settings", {
      erreur: "Clé service_role absente côté serveur : invitation impossible.",
    });
  const { data, error } = await service.auth.admin.inviteUserByEmail(email.data);
  if (error || !data.user)
    back("/admin/settings", {
      erreur: "Invitation impossible (compte existant ? utilisez le script d’initialisation).",
    });
  const { error: insErr } = await supabase
    .from("admin_users")
    .insert({ auth_user_id: data.user.id, email: email.data, role: role.data });
  if (insErr) back("/admin/settings", { erreur: dbError("inviteAdmin", insErr) });
  void session;
  back("/admin/settings", { ok: `Invitation envoyée à ${email.data}.` });
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await requireAdmin(CATALOG_ROLES);
  const [shipping, contact, seo] = await Promise.all([
    readSetting("shop.shipping", DEFAULT_SHIPPING),
    readSetting("shop.contact", DEFAULT_CONTACT),
    readSetting("seo.default", {
      title: "LUMÉANCE — Luminaires design haut de gamme",
      description: DEFAULT_DESCRIPTION,
    }),
  ]);
  const supabase = await createSupabaseServerClient();
  const { data: admins } =
    session.role === "super_admin"
      ? await supabase.from("admin_users").select("*").order("created_at")
      : { data: null };
  return (
    <>
      <PageTitle title="Paramètres" />
      <Flash {...flashFrom(await searchParams)} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Livraison">
          <form action={saveSettings} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="section" value="shipping" />
            <Field label="Frais standard (€)" hint="0 = « à confirmer » dans le panier">
              <input
                name="standardAmount"
                defaultValue={centsToInput(shipping.standardAmount)}
                className={inputClass}
              />
            </Field>
            <Field label="Offerte dès (€)" hint="0 = jamais">
              <input
                name="freeThreshold"
                defaultValue={centsToInput(shipping.freeThreshold)}
                className={inputClass}
              />
            </Field>
            <Field label="Pays livrés (codes ISO)" className="md:col-span-2">
              <input
                name="countries"
                defaultValue={shipping.countries.join(", ")}
                className={inputClass}
              />
            </Field>
            <Field
              label="Mention délais"
              className="md:col-span-2"
              hint="N’annoncer que des délais confirmés par le fournisseur et le transporteur."
            >
              <textarea
                name="deliveryNote"
                rows={3}
                defaultValue={shipping.deliveryNote}
                className={inputClass}
              />
            </Field>
            <div>
              <SubmitButton>Enregistrer</SubmitButton>
            </div>
          </form>
        </Card>
        <Card title="Coordonnées et informations légales">
          <form action={saveSettings} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="section" value="contact" />
            <Field label="E-mail public">
              <input name="email" defaultValue={contact.email} className={inputClass} />
            </Field>
            <Field label="Téléphone">
              <input name="phone" defaultValue={contact.phone} className={inputClass} />
            </Field>
            <Field label="Raison sociale">
              <input name="legalName" defaultValue={contact.legalName} className={inputClass} />
            </Field>
            <Field label="SIRET">
              <input name="siret" defaultValue={contact.siret} className={inputClass} />
            </Field>
            <Field label="Adresse" className="md:col-span-2">
              <textarea
                name="address"
                rows={2}
                defaultValue={contact.address}
                className={inputClass}
              />
            </Field>
            <div>
              <SubmitButton>Enregistrer</SubmitButton>
            </div>
          </form>
        </Card>
        <Card title="Référencement par défaut">
          <form action={saveSettings} className="grid gap-3">
            <input type="hidden" name="section" value="seo" />
            <Field label="Titre">
              <input name="title" maxLength={70} defaultValue={seo.title} className={inputClass} />
            </Field>
            <Field label="Description">
              <textarea
                name="description"
                maxLength={170}
                rows={2}
                defaultValue={seo.description}
                className={inputClass}
              />
            </Field>
            <div>
              <SubmitButton>Enregistrer</SubmitButton>
            </div>
          </form>
        </Card>
        <Card title="Paiement en ligne">
          <p className="text-sm text-brun/75">
            <Badge value="draft" label="Désactivé" /> Le paiement en ligne n’est pas activé dans
            cette version. Son activation se fait côté serveur (variables d’environnement) après
            intégration d’un prestataire : voir <code>docs/PAIEMENT.md</code>.
          </p>
        </Card>
      </div>

      {admins && (
        <div className="mt-8">
          <h2 className="mb-3 font-serif text-xl">Administrateurs</h2>
          <Table head={["E-mail", "Rôle", "Actif", ""]}>
            {admins.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">{a.email ?? a.auth_user_id}</td>
                <td className="px-4 py-3" colSpan={3}>
                  <form action={manageAdmin} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="admin_id" value={a.id} />
                    <select
                      name="role"
                      defaultValue={a.role}
                      className={`${inputClass} max-w-[14rem]`}
                    >
                      {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={a.active}
                        className="accent-champagne"
                      />{" "}
                      Actif
                    </label>
                    <SubmitButton variant="secondary">Mettre à jour</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
          <Card title="Inviter un administrateur" className="mt-4">
            <form action={manageAdmin} className="flex flex-wrap items-end gap-3">
              <Field label="E-mail">
                <input name="email" type="email" required className={inputClass} />
              </Field>
              <Field label="Rôle">
                <select name="role" defaultValue="order_manager" className={inputClass}>
                  {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </Field>
              <SubmitButton>Inviter</SubmitButton>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
