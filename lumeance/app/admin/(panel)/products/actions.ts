"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { imageRows, missingProducts, productRow, variantRows } from "@/lib/admin/catalog-import";
import { firstError, productFromForm } from "@/lib/admin/forms";
import { uploadImage } from "@/lib/admin/media";
import { back, dbError } from "@/lib/admin/redirect";
import { CATALOG_PRODUCTS } from "@/lib/catalog/products";
import { parseEuroInput } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { variantSchema } from "@/lib/validation/schemas";

const id = z.string().uuid();

function refreshStore(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/produit/${slug}`);
}

export async function createProduct(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const parsed = productFromForm(form);
  if (!parsed.success) back("/admin/products/new", { erreur: firstError(parsed.error.issues) });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").insert(parsed.data).select("id").single();
  if (error) back("/admin/products/new", { erreur: dbError("createProduct", error) });
  refreshStore();
  back(`/admin/products/${data.id}`, { ok: "Produit créé." });
}

export async function updateProduct(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const pid = id.parse(form.get("id"));
  const parsed = productFromForm(form);
  if (!parsed.success) back(`/admin/products/${pid}`, { erreur: firstError(parsed.error.issues) });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update(parsed.data).eq("id", pid);
  if (error) back(`/admin/products/${pid}`, { erreur: dbError("updateProduct", error) });
  refreshStore(parsed.data.slug);
  back(`/admin/products/${pid}`, { ok: "Modifications enregistrées." });
}

export async function setProductStatus(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const pid = id.parse(form.get("id"));
  const status = z.enum(["draft", "published", "archived"]).parse(form.get("status"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update({ status }).eq("id", pid);
  if (error) back(`/admin/products/${pid}`, { erreur: dbError("setProductStatus", error) });
  refreshStore();
  back(`/admin/products/${pid}`, {
    ok:
      status === "published"
        ? "Produit publié."
        : status === "archived"
          ? "Produit archivé."
          : "Produit dépublié.",
  });
}

export async function deleteProduct(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const pid = id.parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { data: p } = await supabase.from("products").select("reference").eq("id", pid).single();
  if (!p || String(form.get("confirm") ?? "").trim() !== p.reference) {
    back(`/admin/products/${pid}`, {
      erreur: "Pour supprimer, saisissez exactement la référence du produit.",
    });
  }
  const { data: imgs } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", pid);
  const { error } = await supabase.from("products").delete().eq("id", pid);
  if (error) back(`/admin/products/${pid}`, { erreur: dbError("deleteProduct", error) });
  // Les fichiers restent dans la médiathèque (réutilisables) : seule l'association est supprimée.
  void imgs;
  refreshStore();
  back("/admin/products", {
    ok: "Produit supprimé (les commandes passées conservent leur instantané).",
  });
}

export async function addProductImage(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const pid = id.parse(form.get("id"));
  const alt = String(form.get("alt_text") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  let path = String(form.get("existing_path") ?? "").trim();
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    const up = await uploadImage(supabase, file, "produits", alt);
    if (up.error) back(`/admin/products/${pid}`, { erreur: up.error });
    path = up.path!;
  } else if (path) {
    const { data } = await supabase
      .from("media_assets")
      .select("id")
      .eq("storage_path", path)
      .maybeSingle();
    if (!data) back(`/admin/products/${pid}`, { erreur: "Média introuvable dans la médiathèque." });
  } else {
    back(`/admin/products/${pid}`, { erreur: "Choisissez un fichier ou un média existant." });
  }
  if (!alt)
    back(`/admin/products/${pid}`, {
      erreur: "Le texte alternatif est obligatoire (accessibilité et référencement).",
    });
  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", pid);
  const { error } = await supabase.from("product_images").insert({
    product_id: pid,
    storage_path: path,
    alt_text: alt,
    position: count ?? 0,
    is_primary: !count,
  });
  if (error) back(`/admin/products/${pid}`, { erreur: dbError("addProductImage", error) });
  refreshStore();
  back(`/admin/products/${pid}`, { ok: "Image ajoutée." });
}

export async function updateProductImage(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const pid = id.parse(form.get("product_id"));
  const iid = id.parse(form.get("image_id"));
  const op = z.enum(["primary", "save", "delete"]).parse(form.get("op"));
  const supabase = await createSupabaseServerClient();
  let error = null;
  if (op === "primary") {
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", pid);
    ({ error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", iid));
  } else if (op === "save") {
    const alt = z.string().trim().min(1).max(250).safeParse(form.get("alt_text"));
    const position = z.coerce.number().int().min(0).max(100).safeParse(form.get("position"));
    if (!alt.success || !position.success)
      back(`/admin/products/${pid}`, { erreur: "Texte alternatif ou position invalide." });
    ({ error } = await supabase
      .from("product_images")
      .update({ alt_text: alt.data, position: position.data })
      .eq("id", iid));
  } else {
    ({ error } = await supabase.from("product_images").delete().eq("id", iid));
  }
  if (error) back(`/admin/products/${pid}`, { erreur: dbError("updateProductImage", error) });
  refreshStore();
  back(`/admin/products/${pid}`, { ok: "Images mises à jour." });
}

export async function saveVariant(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const pid = id.parse(form.get("product_id"));
  const vid = form.get("variant_id") ? id.parse(form.get("variant_id")) : null;
  const supabase = await createSupabaseServerClient();
  if (form.get("op") === "delete" && vid) {
    const { error } = await supabase.from("product_variants").delete().eq("id", vid);
    if (error) back(`/admin/products/${pid}`, { erreur: dbError("deleteVariant", error) });
    refreshStore();
    back(`/admin/products/${pid}`, { ok: "Variante supprimée." });
  }
  const adj = String(form.get("price_adjustment") ?? "0").trim();
  const negative = adj.startsWith("-");
  const cents = parseEuroInput(adj.replace(/^[-+]/, "") || "0");
  const parsed = variantSchema.safeParse({
    name: form.get("name"),
    sku: form.get("sku"),
    finish: form.get("finish") ?? "",
    details: form.get("details") ?? "",
    price_adjustment: cents === null ? NaN : negative ? -cents : cents,
    stock_quantity: Number(form.get("stock_quantity") ?? 0),
    active: form.get("active") === "on",
  });
  if (!parsed.success) back(`/admin/products/${pid}`, { erreur: firstError(parsed.error.issues) });
  const { error } = vid
    ? await supabase.from("product_variants").update(parsed.data).eq("id", vid)
    : await supabase.from("product_variants").insert({ ...parsed.data, product_id: pid });
  if (error) back(`/admin/products/${pid}`, { erreur: dbError("saveVariant", error) });
  refreshStore();
  back(`/admin/products/${pid}`, { ok: "Variante enregistrée." });
}

/**
 * Ajoute à la base les pièces préparées dans le code (lib/catalog/products.ts) qui n'y sont pas
 * encore. Une pièce déjà présente (même référence) n'est jamais modifiée.
 */
export async function importCatalogProducts() {
  await requireAdmin(CATALOG_ROLES);
  const supabase = await createSupabaseServerClient();
  const [{ data: existing, error: e1 }, { data: categories, error: e2 }] = await Promise.all([
    supabase.from("products").select("reference"),
    supabase.from("categories").select("id, slug"),
  ]);
  if (e1 || e2) back("/admin/products", { erreur: dbError("importCatalog", (e1 ?? e2)!) });
  const todo = missingProducts(
    CATALOG_PRODUCTS,
    (existing ?? []).map((r) => r.reference),
  );
  if (!todo.length) back("/admin/products", { ok: "Aucune nouvelle pièce à importer." });
  const categoryId = new Map((categories ?? []).map((c) => [c.slug, c.id]));
  const done: string[] = [];
  for (const p of todo) {
    const { data: row, error } = await supabase
      .from("products")
      .insert(productRow(p, categoryId.get(p.categorySlug ?? "") ?? null))
      .select("id")
      .single();
    if (error)
      back("/admin/products", { erreur: `${p.name} : ${dbError("importCatalog", error)}` });
    const [{ error: ev }, { error: ei }] = await Promise.all([
      p.variants.length
        ? supabase.from("product_variants").insert(variantRows(p, row.id))
        : Promise.resolve({ error: null }),
      p.images.length
        ? supabase.from("product_images").insert(imageRows(p, row.id))
        : Promise.resolve({ error: null }),
    ]);
    if (ev || ei) {
      // Pas de pièce à moitié importée : on retire la fiche (versions et images en cascade).
      await supabase.from("products").delete().eq("id", row.id);
      back("/admin/products", { erreur: `${p.name} : ${dbError("importCatalog", (ev ?? ei)!)}` });
    }
    done.push(p.name);
  }
  refreshStore();
  back("/admin/products", { ok: `Importé : ${done.join(", ")}. À relire avant publication.` });
}
