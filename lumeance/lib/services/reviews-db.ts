import "server-only";
import { createSupabasePublicClient, storagePublicUrl } from "@/lib/supabase/public";
import { isSupabaseConfigured } from "@/lib/env";
import type { PublicReview } from "@/lib/services/reviews";

interface Row {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[] | null;
  purchased_at: string;
  published_at: string | null;
  admin_reply: string | null;
}

/** Avis publiés d'une pièce (vue publique), du plus récent au plus ancien. */
export async function getPublishedReviews(productId: string): Promise<PublicReview[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await createSupabasePublicClient()
    .from("published_reviews")
    .select("id, author_name, rating, title, body, photos, purchased_at, published_at, admin_reply")
    .eq("product_id", productId)
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) {
    // Migration des avis pas encore appliquée : la fiche s'affiche sans avis.
    if (!/published_reviews/.test(error.message)) console.error("reviews:", error.message);
    return [];
  }
  return (data as Row[]).map((r) => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    photos: (r.photos ?? []).map(storagePublicUrl),
    purchasedAt: r.purchased_at,
    publishedAt: r.published_at,
    adminReply: r.admin_reply,
  }));
}
