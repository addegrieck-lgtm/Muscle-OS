import { PageHeader } from "@/components/ui/PageHeader";
import { LegalNotice, Prose, Todo } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Confidentialité et cookies",
  description: "Politique de confidentialité et gestion des cookies du site LUMÉANCE.",
  path: "/confidentialite",
});

export default function ConfidentialitePage() {
  return (
    <>
      <PageHeader eyebrow="Informations légales" title="Confidentialité et cookies" />
      <div className="container-luxe pb-32">
        <Prose>
          <LegalNotice />
          <h2>Responsable du traitement</h2>
          <p>
            <Todo>identité et coordonnées du responsable de traitement</Todo>
          </p>
          <h2>Données traitées</h2>
          <ul>
            <li>
              <strong>Lettre d’information</strong> : adresse e-mail, date et origine du
              consentement. Base légale : consentement. Conservation : jusqu’à désinscription, puis
              3 ans maximum pour la preuve du consentement.
            </li>
            <li>
              <strong>Formulaire de contact</strong> : nom, e-mail, message. Base légale : intérêt
              légitime à répondre. Conservation : 3 ans à compter du dernier échange.
            </li>
            <li>
              <strong>Commandes</strong> (à l’ouverture) : identité, coordonnées, adresses, contenu
              de commande. Base légale : exécution du contrat et obligations légales (conservation
              comptable de 10 ans).
            </li>
          </ul>
          <p>
            Aucune coordonnée bancaire n’est collectée par le site. Le paiement, lorsqu’il sera
            ouvert, sera traité par un prestataire spécialisé.
          </p>
          <h2>Destinataires et hébergement</h2>
          <p>
            Les données sont stockées chez notre fournisseur de base de données{" "}
            <Todo>prestataire et région d’hébergement</Todo>. Elles ne sont ni vendues ni louées.
          </p>
          <h2>Vos droits</h2>
          <p>
            Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation,
            d’opposition et de portabilité. Pour exercer ces droits, ou demander la suppression de
            vos données, écrivez-nous via la page <a href="/contact">Contact</a> avec l’objet «
            Données personnelles ». Nous répondons dans un délai d’un mois. Vous pouvez introduire
            une réclamation auprès de la CNIL (cnil.fr).
          </p>
          <h2>Cookies et stockage local</h2>
          <p>
            Le site n’utilise aujourd’hui que des éléments strictement nécessaires, exemptés de
            consentement :
          </p>
          <ul>
            <li>
              votre panier et votre choix en matière de cookies, conservés sur votre appareil
              (stockage local) ;
            </li>
            <li>pour les administrateurs uniquement, un cookie de session d’authentification.</li>
          </ul>
          <p>
            Aucune mesure d’audience, aucun cookie publicitaire et aucun réseau social tiers ne sont
            chargés. Si une mesure d’audience est ajoutée, elle ne sera activée qu’avec votre
            accord, modifiable à tout moment via le lien « Gérer les cookies » en pied de page.
          </p>
        </Prose>
      </div>
    </>
  );
}
