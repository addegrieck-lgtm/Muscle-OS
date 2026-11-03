import Image from "next/image";
import type { Metadata } from "next";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadReviewRequest } from "@/lib/services/review-request";
import { storagePublicUrl } from "@/lib/supabase/public";

// Page personnelle (lien envoyé au client) : jamais indexée.
export const metadata: Metadata = { title: "Votre avis", robots: { index: false, follow: false } };

export default async function ReviewRequestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await loadReviewRequest(token);
  if (!ctx)
    return (
      <>
        <PageHeader eyebrow="Avis" title="Lien non valable" />
        <div className="container-luxe max-w-2xl pb-32 text-brun/75">
          <p>
            Ce lien a expiré ou n’est pas valable. Écrivez-nous depuis la page{" "}
            <a href="/contact" className="underline underline-offset-4">
              Contact
            </a>{" "}
            : nous vous en enverrons un nouveau.
          </p>
        </div>
      </>
    );
  const pending = ctx.items.filter((i) => !i.reviewed);
  return (
    <>
      <PageHeader
        eyebrow="Votre avis"
        title="Merci pour votre commande"
        intro="Votre retour aide d’autres clients à choisir la bonne pièce. Chaque avis est relu avant publication."
      />
      <div className="container-luxe max-w-3xl space-y-16 pb-32">
        {pending.length === 0 && (
          <p className="text-brun/75">
            Vous avez déjà donné votre avis sur toutes les pièces de cette commande. Merci !
          </p>
        )}
        {pending.map((it) => (
          <section
            key={it.productId}
            className="grid gap-8 border-t border-brun/15 pt-10 md:grid-cols-[180px_1fr]"
          >
            <div>
              {it.image && (
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-noir md:w-[180px]">
                  <Image
                    src={storagePublicUrl(it.image)}
                    alt=""
                    fill
                    sizes="180px"
                    className="object-cover"
                  />
                </div>
              )}
              <h2 className="mt-3 font-serif text-2xl">{it.name}</h2>
            </div>
            <ReviewForm
              token={token}
              productId={it.productId}
              productName={it.name}
              defaultName={ctx.defaultName}
            />
          </section>
        ))}
      </div>
    </>
  );
}
