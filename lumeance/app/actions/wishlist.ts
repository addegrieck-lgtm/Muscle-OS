"use server";

import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const MAX_ITEMS = 100;
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const idsSchema = z.array(idSchema).max(MAX_ITEMS);

/** Client connecté (identité vérifiée par Supabase) et client service_role, ou null. */
async function session() {
  if (!isSupabaseConfigured()) return null;
  const { data } = await (await createSupabaseServerClient()).auth.getUser();
  const db = createSupabaseServiceClient();
  return data.user && db ? { userId: data.user.id, db } : null;
}

/**
 * Fusionne les envies gardées dans le navigateur avec celles du compte et renvoie la liste
 * complète (plus récentes d'abord). null : visiteur non connecté (liste locale seulement).
 */
export async function syncWishlist(localIds: unknown): Promise<string[] | null> {
  const s = await session();
  if (!s) return null;
  const parsed = idsSchema.safeParse(localIds);
  const local = parsed.success ? [...new Set(parsed.data)] : [];
  if (local.length) {
    const { error } = await s.db.from("wishlist_items").upsert(
      local.map((product_id) => ({ auth_user_id: s.userId, product_id })),
      { onConflict: "auth_user_id,product_id", ignoreDuplicates: true },
    );
    if (error) console.error("wishlist sync:", error.message);
  }
  const { data, error } = await s.db
    .from("wishlist_items")
    .select("product_id")
    .eq("auth_user_id", s.userId)
    .order("created_at", { ascending: false })
    .limit(MAX_ITEMS);
  if (error) {
    console.error("wishlist read:", error.message);
    return null;
  }
  return data.map((r) => r.product_id);
}

/** Ajoute ou retire une pièce des envies du compte. false : non connecté ou erreur. */
export async function setWishlistItem(productId: unknown, saved: boolean): Promise<boolean> {
  const id = idSchema.safeParse(productId);
  const s = await session();
  if (!id.success || !s) return false;
  const { error } = saved
    ? await s.db
        .from("wishlist_items")
        .upsert(
          { auth_user_id: s.userId, product_id: id.data },
          { onConflict: "auth_user_id,product_id", ignoreDuplicates: true },
        )
    : await s.db
        .from("wishlist_items")
        .delete()
        .eq("auth_user_id", s.userId)
        .eq("product_id", id.data);
  if (error) console.error("wishlist write:", error.message);
  return !error;
}
