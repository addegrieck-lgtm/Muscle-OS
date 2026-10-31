import { ContactForm } from "@/components/layout/ContactForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getContactSettings } from "@/lib/services/content";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Contact",
  description:
    "Une question sur une pièce, un projet d’éclairage ou l’ouverture de la boutique ? Écrivez à LUMÉANCE.",
  path: "/contact",
});

export default async function ContactPage() {
  const contact = await getContactSettings();
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Parlons de votre projet de lumière."
        intro="Une question sur une pièce, une hauteur sous plafond, un escalier à éclairer ? Nous vous répondons personnellement."
      />
      <div className="container-luxe grid gap-16 pb-32 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
        <aside className="space-y-6 lg:col-span-4 lg:col-start-9">
          <div className="bg-creme/70 p-8">
            <h2 className="t-eyebrow text-champagne">Coordonnées</h2>
            <div className="t-small mt-5 space-y-2">
              {contact.email ? (
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              ) : (
                <p>Adresse e-mail publiée à l’ouverture.</p>
              )}
              {contact.phone && <p>{contact.phone}</p>}
              {contact.address && <p className="whitespace-pre-line">{contact.address}</p>}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
