import "server-only";
import { planIsEmpty, syncPlan, type DbProduct } from "@/lib/admin/catalog-sync";
import { dbError } from "@/lib/admin/redirect";
import { CATALOG_PRODUCTS } from "@/lib/catalog/products";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Pièces du code déjà en base, avec leur plan de mise à jour (vide si rien n'a changé). */
export async function catalogSyncPlans() {
  const supabase = await createSupabaseServerClient();
  const [{ data: rows, error: e1 }, { data: categories, error: e2 }] = await Promise.all([
    supabase.from("products").select("*, product_variants(*), product_images(*)"),
    supabase.from("categories").select("id, slug"),
  ]);
  if (e1 || e2) return { error: dbError("catalogSync", (e1 ?? e2)!), plans: [] };
  const categoryId = new Map((categories ?? []).map((c) => [c.slug, c.id]));
  const byRef = new Map((rows ?? []).map((r) => [String(r.reference).toUpperCase(), r]));
  const plans = CATALOG_PRODUCTS.flatMap((p) => {
    const db = byRef.get(p.reference.toUpperCase()) as DbProduct | undefined;
    if (!db) return [];
    const plan = syncPlan(p, db, categoryId.get(p.categorySlug ?? "") ?? null);
    return planIsEmpty(plan) ? [] : [{ product: p, db, plan }];
  });
  return { error: null, plans };
}

