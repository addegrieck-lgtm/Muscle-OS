import { PageHeader } from "@/components/ui/PageHeader";
import { LegalNotice, Prose, Todo } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Conditions générales de vente",
  description: "Conditions générales de vente LUMÉANCE.",
  path: "/cgv",
});

export default function CgvPage() {
  return (
    <>
      <PageHeader eyebrow="Informations légales" title="Conditions générales de vente" />
      <div className="container-luxe pb-32">
        <Prose>
          <LegalNotice />
          <p>
            Les présentes conditions régiront les ventes réalisées sur le site LUMÉANCE.{" "}
            <strong>La boutique n’est pas encore ouverte :</strong> aucune vente ne peut être
            conclue à ce jour.
          </p>
          <h2>1. Vendeur</h2>
          <p>
            <Todo>
              raison sociale, forme juridique, capital, siège, RCS, SIRET, TVA intracommunautaire,
              contact
            </Todo>
          </p>
          <h2>2. Produits</h2>
          <p>
            Les caractéristiques essentielles de chaque produit (dimensions, matériaux,
            caractéristiques électriques) figurent sur sa fiche. Les photographies d’ambiance ne
            sont pas contractuelles ; les illustrations sont signalées comme telles.
          </p>
          <h2>3. Prix</h2>
          <p>
            Les prix sont indiqués en euros toutes taxes comprises, hors frais de livraison indiqués
            avant validation de la commande.
          </p>
          <h2>4. Commande et paiement</h2>
          <p>
            <Todo>
              étapes de commande, moyens de paiement acceptés, prestataire de paiement, moment du
              débit
            </Todo>
          </p>
          <h2>5. Livraison</h2>
          <p>
            Voir la page <a href="/livraison">Livraison</a>.{" "}
            <Todo>délais, transfert des risques, réserves</Todo>
          </p>
          <h2>6. Rétractation et garanties</h2>
          <p>
            Voir la page <a href="/retours">Retours et garanties</a>.
          </p>
          <h2>7. Données personnelles</h2>
          <p>
            Voir la <a href="/confidentialite">politique de confidentialité</a>.
          </p>
          <h2>8. Droit applicable et litiges</h2>
          <p>
            Droit français. Médiation de la consommation : <Todo>médiateur</Todo>. Plateforme
            européenne de règlement en ligne des litiges, le cas échéant.
          </p>
        </Prose>
      </div>
    </>
  );
}
