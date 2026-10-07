import { ButtonLink, Container, EmptyState, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Paiement", description: "Paiement VÆLORIA.", path: "/checkout", noindex: true });

export default function CheckoutPreview() {
  return (
    <>
      <PageHeader title="Paiement" eyebrow="Boutique" crumbs={[{ name: "Boutique", path: "/boutique" }, { name: "Paiement", path: "/checkout" }]} />
      <Section><Container className="max-w-xl"><EmptyState title="Le paiement ouvrira avec le serveur">Ton panier est conservé sur cet appareil.<div className="mt-4"><ButtonLink href="/boutique/panier" variant="secondary">Retour au panier</ButtonLink></div></EmptyState></Container></Section>
    </>
  );
}
