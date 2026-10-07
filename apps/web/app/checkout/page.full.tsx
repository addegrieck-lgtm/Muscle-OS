import { Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";
import { getMe } from "@/lib/session";
import { CheckoutFlow } from "./CheckoutFlow";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({ title: "Paiement", description: "Finaliser ta commande VÆLORIA.", path: "/checkout", noindex: true });

export default async function CheckoutPage() {
  const me = await getMe().catch(() => null);
  return (
    <>
      <PageHeader title="Paiement" eyebrow="Boutique" crumbs={[{ name: "Boutique", path: "/boutique" }, { name: "Paiement", path: "/checkout" }]} />
      <Section className="py-8 sm:py-12">
        <Container>
          <CheckoutFlow me={me} loginHref="/login?next=%2Fcheckout" />
        </Container>
      </Section>
    </>
  );
}
