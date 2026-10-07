import { TextPage } from "@/components/TextPage";
import { pageMeta } from "@/lib/seo";
import { AnalyticsOptOut } from "./OptOut";

export const metadata = pageMeta({ title: "Cookies et traceurs", description: "Traceurs utilisés sur le site VÆLORIA et comment les refuser.", path: "/cookies" });

const BODY = `## Ce que le site utilise

- **Aucun cookie publicitaire, aucun outil d'analyse tiers.**
- Un **identifiant de visite aléatoire** (stockage local du navigateur) pour mesurer l'audience de façon agrégée : pages vues, source de visite, clics sur « Copier l'IP » et « Discord ». Il ne permet pas de t'identifier et aucune adresse IP n'est conservée.
- Cette mesure suit les conditions d'exemption de consentement de la CNIL pour la mesure d'audience. Tu peux néanmoins la refuser ci-dessous ; les signaux « Do Not Track » et « Global Privacy Control » sont respectés automatiquement.

## Contenus externes

Les têtes de skins Minecraft sont chargées depuis mc-heads.net, qui reçoit alors ton adresse IP comme pour toute image externe.

## Plus tard

Si un service nécessitant ton consentement est ajouté (vidéo intégrée, connexion Discord), un choix explicite te sera demandé avant tout dépôt.`;

export default function Page() {
  return (
    <TextPage title="Cookies et traceurs" path="/cookies" body={BODY}>
      <AnalyticsOptOut />
    </TextPage>
  );
}
