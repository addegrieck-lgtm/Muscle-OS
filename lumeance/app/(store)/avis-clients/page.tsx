import { PageHeader } from "@/components/ui/PageHeader";
import { Prose } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Avis clients : comment nous les vérifions",
  description:
    "Avis clients LUMÉANCE : seuls nos clients peuvent déposer un avis, depuis un lien personnel reçu après livraison. Chaque avis est relu avant publication.",
  path: "/avis-clients",
});

/** Information sur le traitement des avis (art. L111-7-2 et D111-17 du Code de la consommation). */
export default function ReviewsPolicyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Service"
        title="Avis clients"
        intro="Comment les avis publiés sur notre site sont recueillis et contrôlés."
      />
      <div className="container-luxe max-w-3xl pb-32">
        <Prose>
          <h2>Qui peut déposer un avis ?</h2>
          <p>
            Uniquement nos clients. Après l’expédition de votre commande, nous vous adressons un
            lien personnel, valable 60 jours, qui permet de noter chacune des pièces achetées. Ce
            lien est réservé à votre commande : il n’est pas possible de déposer un avis sans achat.
          </p>
          <h2>Les avis sont-ils contrôlés ?</h2>
          <p>
            Oui. Chaque avis est relu par notre équipe avant publication, dans un délai habituel de
            quelques jours. Nous publions les avis positifs comme négatifs. Un avis peut être refusé
            s’il contient des propos injurieux ou diffamatoires, des données personnelles, des
            contenus sans rapport avec la pièce ou s’il semble frauduleux ; son auteur en est alors
            informé sur demande.
          </p>
          <h2>Contrepartie</h2>
          <p>Aucune contrepartie n’est accordée en échange d’un avis.</p>
          <h2>Ordre et durée d’affichage</h2>
          <p>
            Les avis sont affichés du plus récent au plus ancien, avec la note, le nom choisi par
            l’auteur (prénom et initiale), le mois d’achat et le mois de publication. Ils restent en
            ligne tant que la pièce est au catalogue.
          </p>
          <h2>Modifier ou retirer votre avis</h2>
          <p>
            Vous pouvez demander la modification ou la suppression de votre avis à tout moment
            depuis la page <a href="/contact">Contact</a>.
          </p>
        </Prose>
      </div>
    </>
  );
}
