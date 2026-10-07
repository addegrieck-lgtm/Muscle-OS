import { TextPage } from "@/components/TextPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Politique de confidentialité", description: "Données personnelles traitées par VÆLORIA et vos droits (RGPD).", path: "/confidentialite" });

const BODY = `## Responsable du traitement

[À RENSEIGNER] — contact : [À RENSEIGNER]

## Données traitées et finalités

- **Données de jeu** (UUID et pseudo Minecraft, statistiques, faction) : fonctionnement du serveur, classements et profils publics. Base légale : exécution du service.
- **Inscription bêta** (pseudo Minecraft, e-mail facultatif) : te prévenir de l'ouverture. Base légale : consentement. Conservation : jusqu'à l'ouverture + 3 mois.
- **Compte web** (identifiant et pseudo Discord, liaison Minecraft) : accès à l'espace compte. Base légale : exécution du service.
- **Achats** (commande, montant, identifiant de paiement — jamais tes données bancaires, traitées par le prestataire de paiement) : livraison, comptabilité, obligations légales. Conservation : 10 ans pour les pièces comptables.
- **Mesure d'audience** : identifiant aléatoire, pages vues, source de visite. Aucune adresse IP n'est stockée, aucun outil tiers. Voir la page [cookies](/cookies).

## Destinataires

Données hébergées chez [À RENSEIGNER]. Prestataire de paiement : [À RENSEIGNER]. Aucune revente de données.

## Tes droits

Accès, rectification, effacement, opposition, limitation et portabilité : écris à [À RENSEIGNER]. Tu peux aussi saisir la CNIL (cnil.fr).`;

export default function Page() {
  return <TextPage title="Politique de confidentialité" path="/confidentialite" body={BODY} />;
}
