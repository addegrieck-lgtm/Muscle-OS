import { ClearCartOnMount } from "@/components/checkout/CheckoutForm";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPaymentProvider } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo/metadata";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const metadata = pageMetadata({
  title: "Merci pour votre commande",
  description: "Confirmation de votre commande LUMÉANCE.",
  path: "/commande/confirmation",
  noindex: true,
});

/**
 * Retour depuis la page de paiement. Ce retour ne confirme RIEN à lui seul : l'état affiché est
 * relu auprès du prestataire et la commande n'est marquée payée que par le webhook signé.
 */
export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const raw = (await searchParams).session_id;
  const sessionId = typeof raw === "string" ? raw : "";
  let session: { orderId: string | null; paid: boolean } | null = null;
  try {
    session = sessionId ? await getPaymentProvider().getCheckoutSession(sessionId) : null;
  } catch {
    session = null;
  }
  let orderNumber: string | null = null;
  if (session?.orderId) {
    const db = createSupabaseServiceClient();
    const { data } = db
      ? await db.from("orders").select("order_number").eq("id", session.orderId).maybeSingle()
      : { data: null };
    orderNumber = data?.order_number ?? null;
  }

  if (!session) {
    return (
      <>
        <PageHeader eyebrow="Commande" title="Paiement introuvable." />
        <div className="container-luxe pb-32">
          <p>
            Nous ne retrouvons pas ce paiement. Si vous avez été débité, contactez-nous : nous
            vérifierons votre commande.
          </p>
          <div className="mt-10">
            <ButtonLink href="/contact">Nous contacter</ButtonLink>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <ClearCartOnMount />
      <PageHeader
        eyebrow={orderNumber ? `Commande ${orderNumber}` : "Commande"}
        title="Merci pour votre commande."
      />
      <div className="container-luxe max-w-2xl pb-32">
        <p>
          {session.paid
            ? "Votre paiement a bien été accepté. Nous revenons vers vous par e-mail pour la préparation et la livraison de vos pièces."
            : "Votre paiement est en cours de traitement. Vous recevrez une confirmation par e-mail dès sa validation."}
        </p>
        <div className="mt-10">
          <ButtonLink href="/collections">Continuer la visite</ButtonLink>
        </div>
      </div>
    </>
  );
}
