import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { checkoutAvailable } from "@/lib/payments";
import { getCurrentAccount } from "@/lib/services/account";
import { getShippingSettings } from "@/lib/services/content";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Commande",
  description: "Finalisez votre commande LUMÉANCE.",
  path: "/commande",
  noindex: true,
});

export default async function CheckoutPage() {
  if (!checkoutAvailable()) {
    return (
      <>
        <PageHeader eyebrow="Commande" title="Bientôt disponible." />
        <div className="container-luxe pb-32">
          <p>La commande en ligne n’est pas encore ouverte.</p>
          <div className="mt-10">
            <ButtonLink href="/panier">Retour au panier</ButtonLink>
          </div>
        </div>
      </>
    );
  }
  const [account, shipping] = await Promise.all([getCurrentAccount(), getShippingSettings()]);
  return (
    <>
      <PageHeader eyebrow="Commande" title="Livraison et paiement" />
      <div className="container-luxe pb-32">
        <CheckoutForm
          countries={shipping.countries}
          defaults={{
            email: account?.email ?? "",
            first_name: account?.firstName ?? "",
            last_name: account?.lastName ?? "",
            phone: account?.phone ?? "",
            emailLocked: Boolean(account?.email),
          }}
        />
      </div>
    </>
  );
}
