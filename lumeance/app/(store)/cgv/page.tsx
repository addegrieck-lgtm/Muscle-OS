import { CIRCLE_LEVELS, REFERRAL_AMOUNT, REFERRAL_MIN_ORDER } from "@/lib/catalog/loyalty";
import { PRO_TIERS_LABEL } from "@/lib/catalog/pro";
import { formatPrice } from "@/lib/money";
import { LEGAL_PENDING } from "@/lib/seo/legal";
import { PageHeader } from "@/components/ui/PageHeader";
import { LegalNotice, Prose, Todo } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Conditions générales de vente",
  description: "Conditions générales de vente LUMÉANCE.",
  path: "/cgv",
  // Hors index tant que les champs « À compléter » ne sont pas remplis (lib/seo/legal.ts).
  noindex: LEGAL_PENDING,
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
            avant validation de la commande. Pour un compte entreprise validé, ils sont également
            présentés hors taxes (TVA de 20 %) ; le total TTC reste indiqué.
          </p>
          <h3>Avantages des comptes clients</h3>
          <p>
            Les avantages ci-dessous sont réservés aux titulaires d’un compte, ne s’appliquent pas
            aux pièces déjà en promotion (offre par lot ou prix barré) ni aux frais de livraison, et
            sont calculés automatiquement au moment de la commande. Ils ne sont ni échangeables ni
            remboursables et peuvent être modifiés pour l’avenir, sans effet sur les commandes
            passées.
          </p>
          <ul>
            <li>
              <strong>Comptes entreprise</strong> (professionnels disposant d’un SIRET, après
              vérification par LUMÉANCE) : {PRO_TIERS_LABEL}, selon le montant hors taxes des pièces
              commandées.
            </li>
            <li>
              <strong>Cercle Luméance</strong> (particuliers) :{" "}
              {CIRCLE_LEVELS.map(
                (l) => `${l.name}, −${l.percent} % dès ${formatPrice(l.min)} d’achats cumulés`,
              ).join(" ; ")}
              . Seules les commandes payées et non remboursées comptent.
            </li>
            <li>
              <strong>Parrainage</strong> (particuliers) : {formatPrice(REFERRAL_AMOUNT)} de remise
              pour le filleul sur sa première commande d’au moins {formatPrice(REFERRAL_MIN_ORDER)}{" "}
              ; {formatPrice(REFERRAL_AMOUNT)} d’avoir pour le parrain quand cette commande est
              payée, utilisable sur une commande d’au moins {formatPrice(REFERRAL_MIN_ORDER)}, un
              avoir par commande. Le parrainage de soi-même ou par des comptes multiples est exclu.
            </li>
          </ul>
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
