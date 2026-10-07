import { TextPage } from "@/components/TextPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Mentions légales", description: "Mentions légales du site VÆLORIA.", path: "/mentions-legales" });

const BODY = `## Éditeur du site

- Raison sociale / nom : [À RENSEIGNER]
- Forme juridique et capital : [À RENSEIGNER]
- Adresse du siège : [À RENSEIGNER]
- SIREN / RCS : [À RENSEIGNER]
- N° TVA intracommunautaire : [À RENSEIGNER]
- Directeur de la publication : [À RENSEIGNER]
- Contact : [À RENSEIGNER]

## Hébergement

- Hébergeur : [À RENSEIGNER]
- Adresse : [À RENSEIGNER]
- Téléphone : [À RENSEIGNER]

## Propriété intellectuelle

La marque VÆLORIA, le logo et les contenus du site sont protégés. Minecraft est une marque de Mojang Studios / Microsoft. VÆLORIA est un serveur indépendant, non affilié à Mojang Studios ni à Microsoft.`;

export default function Page() {
  return <TextPage title="Mentions légales" path="/mentions-legales" body={BODY} />;
}
