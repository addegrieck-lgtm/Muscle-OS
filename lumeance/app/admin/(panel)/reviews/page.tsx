import Link from "next/link";
import { Badge, Card, Flash, PageTitle, flashFrom, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/admin";
import { monthYear } from "@/lib/services/reviews";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storagePublicUrl } from "@/lib/supabase/public";
import { publishReview, rejectReview, replyToReview } from "./actions";

export const metadata = { title: "Avis clients" };

const TABS = [
  { id: "pending", label: "À relire" },
  { id: "published", label: "Publiés" },
  { id: "rejected", label: "Refusés" },
] as const;

interface Row {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  status: string;
  admin_reply: string | null;
  moderation_note: string | null;
  purchased_at: string;
  created_at: string;
  products: { name: string; slug: string } | null;
  orders: { id: string; order_number: string } | null;
}

export default async function ReviewsAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.id === sp.statut) ? sp.statut! : "pending";
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("product_reviews")
      .select(
        "id, author_name, rating, title, body, photos, status, admin_reply, moderation_note, purchased_at, created_at, products(name, slug), orders(id, order_number)",
      )
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("product_reviews")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  // Photos en attente : liens temporaires vers le bucket privé.
  const signed = new Map<string, string>();
  const privatePaths = rows.flatMap((r) => r.photos.filter((p) => !p.startsWith("reviews/")));
  if (privatePaths.length) {
    const { data: s } = await supabase.storage
      .from("review-uploads")
      .createSignedUrls(privatePaths, 3600);
    for (const x of s ?? []) if (x.path && x.signedUrl) signed.set(x.path, x.signedUrl);
  }
  const photoUrl = (p: string) => (p.startsWith("reviews/") ? storagePublicUrl(p) : signed.get(p));

  return (
    <>
      <PageTitle
        title="Avis clients"
        subtitle="Avis vérifiés : déposés depuis le lien personnel d’une commande expédiée"
      />
      <Flash
        {...flashFrom(sp)}
        error={
          error
            ? "Avis indisponibles : collez la migration supabase/migrations/20261107000100_reviews.sql dans Supabase → SQL Editor."
            : flashFrom(sp).error
        }
      />
      <div className="mb-6 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/reviews?statut=${t.id}`}
            className={`px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${t.id === tab ? "bg-brun text-ivoire" : "border border-brun/15"}`}
          >
            {t.label}
            {t.id === "pending" && pendingCount ? ` (${pendingCount})` : ""}
          </Link>
        ))}
      </div>
      <p className="mb-6 text-sm text-brun/60">
        Pour demander un avis : ouvrez une commande expédiée ou livrée, puis « Créer le lien de
        demande d’avis » et envoyez ce lien au client.
      </p>
      {rows.length === 0 && <p className="text-sm text-brun/50">Aucun avis dans cette rubrique.</p>}
      <div className="space-y-6">
        {rows.map((r) => (
          <Card key={r.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg text-champagne">
                  {"★".repeat(r.rating)}
                  <span className="text-brun/20">{"★".repeat(5 - r.rating)}</span>
                </p>
                {r.title && <p className="mt-1 font-serif text-xl">{r.title}</p>}
                <p className="mt-2 whitespace-pre-line text-sm">{r.body}</p>
                <p className="mt-3 text-xs text-brun/55">
                  {r.author_name} · {r.products?.name ?? "Pièce retirée"} · achat{" "}
                  {monthYear(r.purchased_at)} · reçu le{" "}
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  {r.orders && (
                    <>
                      {" "}
                      ·{" "}
                      <Link href={`/admin/orders/${r.orders.id}`} className="underline">
                        {r.orders.order_number}
                      </Link>
                    </>
                  )}
                </p>
                {r.moderation_note && (
                  <p className="mt-2 text-xs text-red-800">Motif : {r.moderation_note}</p>
                )}
              </div>
              <Badge value={r.status} label={TABS.find((t) => t.id === r.status)?.label} />
            </div>
            {r.photos.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {r.photos.map((p) => {
                  const u = photoUrl(p);
                  return u ? (
                    <a key={p} href={u} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-28 w-28 object-cover" />
                    </a>
                  ) : null;
                })}
              </div>
            )}
            <div className="mt-5 grid gap-4 border-t border-brun/10 pt-4 lg:grid-cols-2">
              <form action={replyToReview} className="space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <textarea
                  name="reply"
                  rows={2}
                  maxLength={2000}
                  defaultValue={r.admin_reply ?? ""}
                  placeholder="Réponse de LUMÉANCE (publiée sous l’avis)"
                  className={inputClass}
                />
                <SubmitButton variant="secondary">Enregistrer la réponse</SubmitButton>
              </form>
              <div className="flex flex-wrap items-start gap-3">
                {r.status !== "published" && (
                  <form action={publishReview}>
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton variant="primary">Publier</SubmitButton>
                  </form>
                )}
                {r.status !== "rejected" && (
                  <form action={rejectReview} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input
                      name="note"
                      placeholder="Motif (interne)"
                      maxLength={500}
                      className={`${inputClass} max-w-[14rem]`}
                    />
                    <SubmitButton confirm="Refuser cet avis ? Il ne sera pas publié.">
                      Refuser
                    </SubmitButton>
                  </form>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
