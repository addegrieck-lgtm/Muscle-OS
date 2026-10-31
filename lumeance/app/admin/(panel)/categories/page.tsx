import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Card, Field, Flash, PageTitle, flashFrom, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { firstError, slugify } from "@/lib/admin/forms";
import { back, dbError } from "@/lib/admin/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validation/schemas";

export const metadata = { title: "Catégories" };

async function saveCategory(form: FormData) {
  "use server";
  await requireAdmin(CATALOG_ROLES);
  const supabase = await createSupabaseServerClient();
  const cid = form.get("id") ? z.string().uuid().parse(form.get("id")) : null;
  if (form.get("op") === "delete" && cid) {
    const { error } = await supabase.from("categories").delete().eq("id", cid);
    if (error) back("/admin/categories", { erreur: dbError("deleteCategory", error) });
    revalidatePath("/", "layout");
    back("/admin/categories", {
      ok: "Catégorie supprimée (les produits associés n’ont plus de catégorie).",
    });
  }
  const name = String(form.get("name") ?? "");
  const parsed = categorySchema.safeParse({
    name,
    slug: String(form.get("slug") ?? "").trim() || slugify(name),
    description: String(form.get("description") ?? ""),
    position: Number(form.get("position") ?? 0),
    active: form.get("active") === "on",
  });
  if (!parsed.success) back("/admin/categories", { erreur: firstError(parsed.error.issues) });
  const { error } = cid
    ? await supabase.from("categories").update(parsed.data).eq("id", cid)
    : await supabase.from("categories").insert(parsed.data);
  if (error) back("/admin/categories", { erreur: dbError("saveCategory", error) });
  revalidatePath("/", "layout");
  back("/admin/categories", { ok: "Catégorie enregistrée." });
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin(CATALOG_ROLES);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("categories").select("*, products(count)").order("position");
  return (
    <>
      <PageTitle
        title="Catégories"
        subtitle="Les univers présentés sur le site (pages /collections/…)"
      />
      <Flash {...flashFrom(await searchParams)} />
      <div className="grid gap-4 xl:grid-cols-2">
        {[...(data ?? []), null].map((c) => (
          <Card key={c?.id ?? "new"} title={c ? c.name : "Nouvelle catégorie"}>
            <form action={saveCategory} className="grid gap-3 md:grid-cols-2">
              {c && <input type="hidden" name="id" value={c.id} />}
              <Field label="Nom">
                <input name="name" required defaultValue={c?.name} className={inputClass} />
              </Field>
              <Field label="Slug">
                <input name="slug" defaultValue={c?.slug} className={inputClass} />
              </Field>
              <Field label="Description" className="md:col-span-2">
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={c?.description ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Position">
                <input
                  name="position"
                  type="number"
                  min={0}
                  defaultValue={c?.position ?? 0}
                  className={inputClass}
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-3 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={c?.active ?? true}
                  className="accent-champagne"
                />{" "}
                Active
              </label>
              <div className="flex gap-2 md:col-span-2">
                <SubmitButton>{c ? "Enregistrer" : "Créer"}</SubmitButton>
                {c && (
                  <button
                    name="op"
                    value="delete"
                    className="border border-[#8a3b2a]/30 px-3 text-[0.65rem] uppercase text-[#8a3b2a]"
                  >
                    Supprimer
                  </button>
                )}
                {c && (
                  <span className="self-center text-xs text-brun/50">
                    {(c.products as { count: number }[])[0]?.count ?? 0} produit(s)
                  </span>
                )}
              </div>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
