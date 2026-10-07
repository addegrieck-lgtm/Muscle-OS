import { LINKS } from "@vaeloria/config";
import { TextPage } from "@/components/TextPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Contact", description: "Contacter l'équipe VÆLORIA.", path: "/contact" });

const BODY = `## Joueurs

Le plus rapide : un ticket sur le [Discord](${LINKS.discord}). Voir aussi la page [support](/support).

## Partenariats, presse, créateurs

E-mail : [À RENSEIGNER]

## Données personnelles

E-mail : [À RENSEIGNER] — voir la [politique de confidentialité](/confidentialite).`;

export default function Page() {
  return <TextPage title="Contact" path="/contact" body={BODY} />;
}
