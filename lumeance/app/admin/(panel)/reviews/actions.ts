"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { back, dbError } from "@/lib/admin/redirect";
import { hashReviewToken, newReviewToken, REVIEWABLE_ORDER_STATUSES } from "@/lib/services/reviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();

/**
 * Crée (ou renouvelle) le lien de demande d'avis d'une commande expédiée ou livrée. Le jeton n'est
 * affiché qu'une fois, sur la page de la commande ; seule son empreinte est conservée.
 */
export async function createReviewRequest(form: FormData) {
  await requireAdmin();
  const orderId = uuid.parse(form.get("orderId"));
  const page = `/admin/orders/${orderId}`;
  const supabase = await createSupabaseServerClient();
  const { data: o } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  if (!o || !(REVIEWABLE_ORDER_STATUSES as readonly string[]).includes(o.status))
    back(page, {
      erreur: "Un lien d’avis ne peut être créé qu’après l’expédition de la commande.",
    });
  const token = newReviewToken();
  const { error } = await supabase.from("review_requests").upsert(
    {
      order_id: orderId,
      token_hash: await hashReviewToken(token),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 864e5).toISOString(),
    },
    { onConflict: "order_id" },
  );
  if (error) back(page, { erreur: dbError("createReviewRequest", error) });
  redirect(`${page}?avis=${encodeURIComponent(token)}#avis`);
}

const listPath = "/admin/reviews";

/** Publie un avis : ses photos passent du bucket privé au bucket public « media ». */
export async function publishReview(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = uuid.parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { data: r, error } = await supabase
    .from("product_reviews")
    .select("photos, products(slug)")
    .eq("id", id)
    .maybeSingle();
  if (error || !r)
    back(listPath, { erreur: dbError("publishReview", error) || "Avis introuvable." });
  const moved: string[] = [];
  for (const p of r.photos ?? []) {
    if (p.startsWith("reviews/")) {
      moved.push(p);
      continue;
    }
    const { data: blob, error: e1 } = await supabase.storage.from("review-uploads").download(p);
    if (e1 || !blob) back(listPath, { erreur: "Une photo de l’avis est introuvable." });
    const ext = p.split(".").pop() ?? "jpg";
    const dest = `reviews/${randomUUID()}.${ext}`;
    const { error: e2 } = await supabase.storage
      .from("media")
      .upload(dest, blob, { contentType: blob.type || "image/jpeg", cacheControl: "31536000" });
    if (e2) back(listPath, { erreur: "La copie d’une photo a échoué." });
    moved.push(dest);
  }
  const { error: e3 } = await supabase
    .from("product_reviews")
    .update({ status: "published", photos: moved, published_at: new Date().toISOString() })
    .eq("id", id);
  if (e3) back(listPath, { erreur: dbError("publishReview", e3) });
  const old = (r.photos ?? []).filter((p: string) => !p.startsWith("reviews/"));
  if (old.length) await supabase.storage.from("review-uploads").remove(old);
  const slug = (r.products as unknown as { slug: string } | null)?.slug;
  if (slug) revalidatePath(`/produit/${slug}`);
  back(listPath, { ok: "Avis publié." });
}

export async function rejectReview(form: FormData) {
  await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const note = String(form.get("note") ?? "").slice(0, 500) || null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_reviews")
    .update({ status: "rejected", moderation_note: note, published_at: null })
    .eq("id", id);
  if (error) back(listPath, { erreur: dbError("rejectReview", error) });
  revalidatePath("/", "layout");
  back(listPath, { ok: "Avis refusé : il n’apparaît pas sur le site." });
}

export async function replyToReview(form: FormData) {
  await requireAdmin();
  const id = uuid.parse(form.get("id"));
  const reply =
    String(form.get("reply") ?? "")
      .trim()
      .slice(0, 2000) || null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_reviews")
    .update({ admin_reply: reply })
    .eq("id", id);
  if (error) back(listPath, { erreur: dbError("replyToReview", error) });
  revalidatePath("/", "layout");
  back(listPath, { ok: reply ? "Réponse enregistrée." : "Réponse retirée." });
}
