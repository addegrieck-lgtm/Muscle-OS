import { PageHeader } from "@/components/ui/PageHeader";
import { LegalNotice, Prose } from "@/components/ui/Prose";
import { getShippingSettings } from "@/lib/services/content";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Livraison",
  description:
    "Informations de livraison LUMÉANCE : zones, délais communiqués pièce par pièce, réception des luminaires.",
  path: "/livraison",
});

export default async function LivraisonPage() {
  const shipping = await getShippingSettings();
  return (
    <>
      <PageHeader eyebrow="Service" title="Livraison" />
      <div className="container-luxe pb-32">
        <Prose>
          <LegalNotice />
          <h2>Zones de livraison</h2>
          <p>
            À l’ouverture, la livraison sera proposée en France métropolitaine. D’autres pays
            pourront être ajoutés ultérieurement.
          </p>
          <h2>Délais</h2>
          <p>{shipping.deliveryNote}</p>
          <p>
            Nous visons des délais courts lorsque la pièce est disponible dans un entrepôt européen,
            mais aucun délai ne sera annoncé sur une fiche produit sans avoir été confirmé par le
            fournisseur et le transporteur. Le délai applicable est indiqué avant la validation de
            la commande.
          </p>
          <h2>Frais</h2>
          <p>
            Les frais de livraison seront affichés dans le panier avant toute validation. Aucun
            frais caché ne sera ajouté après coup.
          </p>
          <h2>Réception</h2>
          <ul>
            <li>
              Vérifiez l’état du colis en présence du livreur et notez toute réserve précise sur le
              bon de livraison.
            </li>
            <li>
              Conservez l’emballage d’origine : il protège les pièces en verre et en cristal en cas
              de retour.
            </li>
            <li>Signalez-nous tout dommage dès que possible avec des photographies.</li>
          </ul>
        </Prose>
      </div>
    </>
  );
}
