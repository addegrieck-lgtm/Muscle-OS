import { ButtonLink, Container, EmptyState, Section } from "@vaeloria/ui";
import type { OrderView } from "@vaeloria/types";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";
import { ApiError, authedApi, getMe } from "@/lib/session";
import { OrderStatus } from "./OrderStatus";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({ title: "Confirmation de commande", description: "Suivi de ta commande VÆLORIA.", path: "/checkout/confirmation", noindex: true });

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<{ commande?: string }> }) {
  const publicId = (await searchParams).commande ?? "";
  const me = await getMe().catch(() => null);
  let order: OrderView | null = null;
  if (me && /^VAL-\d{4}-\d{6}$/.test(publicId)) {
    order = await authedApi<OrderView>(`/api/v1/shop/orders/${publicId}`).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    });
  }
  return (
    <>
      <PageHeader title="Ta commande" eyebrow="Boutique" crumbs={[{ name: "Boutique", path: "/boutique" }, { name: "Confirmation", path: "/checkout/confirmation" }]} />
      <Section className="py-8 sm:py-12">
        <Container className="max-w-2xl">
          {order ? (
            <OrderStatus initial={order} />
          ) : (
            <EmptyState title={me ? "Commande introuvable" : "Connecte-toi pour suivre ta commande"}>
              <div className="mt-4"><ButtonLink href={me ? "/compte" : `/login?next=${encodeURIComponent(`/checkout/confirmation?commande=${publicId}`)}`} variant="secondary">{me ? "Mes commandes" : "Se connecter"}</ButtonLink></div>
            </EmptyState>
          )}
        </Container>
      </Section>
    </>
  );
}
