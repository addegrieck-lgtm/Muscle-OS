import { PageHeader } from "@/components/ui/PageHeader";
import { LegalNotice, Prose, Todo } from "@/components/ui/Prose";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Retours et garanties",
  description:
    "Droit de rétractation, retours, garantie légale de conformité et garantie des vices cachés chez LUMÉANCE.",
  path: "/retours",
});

export default function RetoursPage() {
  return (
    <>
      <PageHeader eyebrow="Service" title="Retours et garanties" />
      <div className="container-luxe pb-32">
        <Prose>
          <LegalNotice />
          <h2>Droit de rétractation</h2>
          <p>
            Conformément aux articles L221-18 et suivants du Code de la consommation, vous disposez
            d’un délai de 14 jours à compter de la réception de votre commande pour exercer votre
            droit de rétractation, sans avoir à justifier de motif.
          </p>
          <p>
            Le remboursement intervient au plus tard 14 jours après notification de la rétractation
            ; il peut être différé jusqu’à récupération des biens ou preuve de leur expédition.
            Prise en charge des frais de retour : <Todo>conditions</Todo>.
          </p>
          <h2>Garantie légale de conformité</h2>
          <p>
            Tous nos produits bénéficient de la garantie légale de conformité (articles L217-3 et
            suivants du Code de la consommation) pendant deux ans à compter de la délivrance du
            bien, ainsi que de la garantie des vices cachés (articles 1641 et suivants du Code
            civil).
          </p>
          <h2>Comment nous contacter</h2>
          <p>
            Pour toute demande de retour ou de mise en œuvre d’une garantie, écrivez-nous via la
            page <a href="/contact">Contact</a> en précisant votre numéro de commande.
          </p>
          <h2>Médiation</h2>
          <p>
            En cas de litige non résolu, vous pouvez recourir gratuitement à un médiateur de la
            consommation : <Todo>nom et coordonnées du médiateur</Todo>.
          </p>
        </Prose>
      </div>
    </>
  );
}
