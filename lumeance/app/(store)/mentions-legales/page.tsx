import { PageHeader } from "@/components/ui/PageHeader";
import { LegalNotice, Prose, Todo } from "@/components/ui/Prose";
import { getContactSettings } from "@/lib/services/content";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Mentions légales",
  description: "Mentions légales du site LUMÉANCE.",
  path: "/mentions-legales",
});

export default async function MentionsPage() {
  const c = await getContactSettings();
  return (
    <>
      <PageHeader eyebrow="Informations légales" title="Mentions légales" />
      <div className="container-luxe pb-32">
        <Prose>
          <LegalNotice />
          <h2>Éditeur du site</h2>
          <p>{c.legalName || <Todo>raison sociale et forme juridique</Todo>}</p>
          <p>{c.address || <Todo>adresse du siège</Todo>}</p>
          <p>SIRET : {c.siret || <Todo>numéro SIRET</Todo>}</p>
          <p>
            Directeur de la publication : <Todo>nom</Todo>
          </p>
          <p>Contact : {c.email || <Todo>adresse e-mail</Todo>}</p>
          <h2>Hébergement</h2>
          <p>
            <Todo>nom, adresse et téléphone de l’hébergeur du site et de la base de données</Todo>
          </p>
          <h2>Propriété intellectuelle</h2>
          <p>
            La marque LUMÉANCE, son logo et les contenus du site sont protégés. Le nom et la marque
            restent soumis à vérification de disponibilité et à dépôt{" "}
            <Todo>numéro de dépôt INPI le cas échéant</Todo>.
          </p>
        </Prose>
      </div>
    </>
  );
}
