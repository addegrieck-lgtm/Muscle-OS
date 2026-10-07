import { TextPage } from "@/components/TextPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Conditions générales de vente", description: "CGV de la boutique VÆLORIA.", path: "/cgv" });

const BODY = `> Document à faire valider juridiquement avant l'ouverture de la boutique.

## Vendeur

[À RENSEIGNER] (voir les [mentions légales](/mentions-legales)).

## Produits

Contenus numériques utilisables sur le serveur VÆLORIA (cosmétiques, grades, effets, tags). Ils ne donnent aucun avantage de combat et n'ont aucune valeur monétaire hors du serveur.

## Prix et paiement

Prix en euros TTC. Paiement via [À RENSEIGNER]. La commande n'est validée qu'après confirmation du paiement par le prestataire.

## Livraison

Livraison automatique sur le compte Minecraft indiqué, en général dans les minutes qui suivent. Chaque commande porte un numéro (VAL-AAAA-NNNNNN) à communiquer au [support](/support) en cas de problème.

## Droit de rétractation

Contenu numérique fourni immédiatement : en validant ta commande, tu demandes l'exécution immédiate et renonces à ton droit de rétractation (art. L221-28 13° du Code de la consommation). [À VALIDER]

## Mineurs

Les mineurs doivent obtenir l'accord de leur représentant légal avant tout achat.

## Litiges

[À RENSEIGNER] — médiateur de la consommation : [À RENSEIGNER].`;

export default function Page() {
  return <TextPage title="Conditions générales de vente" path="/cgv" body={BODY} />;
}
