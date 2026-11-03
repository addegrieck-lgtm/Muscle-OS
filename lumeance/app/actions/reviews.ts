"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import type { FormState } from "@/app/actions/public";
import { allowRequest } from "@/lib/services/request-guard";
import { checkUpload } from "@/lib/services/media";
import { clientIp } from "@/lib/services/rate-limit";
import { loadReviewRequest } from "@/lib/services/review-request";
import { REVIEW_MAX_PHOTOS, reviewSchema } from "@/lib/services/reviews";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Dépôt d'un avis par un client, depuis son lien personnel. L'avis est enregistré « en attente » :
 * il n'apparaît sur le site qu'après relecture dans l'administration.
 */
export async function submitReview(_: FormState, form: FormData): Promise<FormState> {
  if (!(await allowRequest(`review:${clientIp(await headers())}`, 8, 10 * 60_000, "FORMS_LIMITER")))
    return { ok: false, message: "Trop de tentatives. Merci de réessayer dans quelques minutes." };
  const parsed = reviewSchema.safeParse(
    Object.fromEntries([...form].filter(([, v]) => typeof v === "string")),
  );
  if (!parsed.success)
    return {
      ok: false,
      message: "Merci de vérifier le formulaire.",
      errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
    };
  if (parsed.data.website) return { ok: true, message: "Merci." };
  const ctx = await loadReviewRequest(parsed.data.token);
  if (!ctx)
    return {
      ok: false,
      message: "Ce lien n’est plus valable. Contactez-nous pour en recevoir un nouveau.",
    };
  const item = ctx.items.find((i) => i.productId === parsed.data.productId);
  if (!item) return { ok: false, message: "Cette pièce ne fait pas partie de votre commande." };
  if (item.reviewed)
    return { ok: false, message: "Vous avez déjà donné votre avis sur cette pièce. Merci !" };

  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > REVIEW_MAX_PHOTOS)
    return {
      ok: false,
      message: `${REVIEW_MAX_PHOTOS} photos au maximum.`,
      errors: { photos: "Trop de photos" },
    };
  const db = createSupabaseServiceClient();
  if (!db) return { ok: false, message: "Le dépôt d’avis n’est pas encore disponible." };

  // Photos : contrôle du contenu réel, puis bucket privé (visibles seulement après publication).
  const uploaded: string[] = [];
  for (const f of files) {
    const buf = new Uint8Array(await f.arrayBuffer());
    const check = checkUpload(f.size, buf.slice(0, 16));
    if (!check.ok) {
      if (uploaded.length) await db.storage.from("review-uploads").remove(uploaded);
      return { ok: false, message: check.error!, errors: { photos: check.error! } };
    }
    const path = `${ctx.requestId}/${randomUUID()}.${check.extension}`;
    const { error } = await db.storage
      .from("review-uploads")
      .upload(path, buf, { contentType: check.type, upsert: false });
    if (error) {
      console.error("review upload:", error.message);
      if (uploaded.length) await db.storage.from("review-uploads").remove(uploaded);
      return {
        ok: false,
        message: "L’envoi des photos a échoué. Réessayez sans photo ou plus tard.",
      };
    }
    uploaded.push(path);
  }

  const { authorName, rating, title, body } = parsed.data;
  const { error } = await db.from("product_reviews").insert({
    request_id: ctx.requestId,
    order_id: ctx.orderId,
    product_id: item.productId,
    author_name: authorName,
    rating,
    title: title || null,
    body,
    photos: uploaded,
    purchased_at: ctx.purchasedAt,
  });
  if (error) {
    if (uploaded.length) await db.storage.from("review-uploads").remove(uploaded);
    if (error.code === "23505")
      return { ok: false, message: "Vous avez déjà donné votre avis sur cette pièce. Merci !" };
    console.error("review insert:", error.message);
    return { ok: false, message: "Une erreur est survenue. Merci de réessayer plus tard." };
  }
  return {
    ok: true,
    message:
      "Merci ! Votre avis a bien été reçu. Il sera publié après relecture, en général sous quelques jours.",
  };
}
