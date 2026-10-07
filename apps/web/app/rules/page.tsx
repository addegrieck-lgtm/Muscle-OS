import { TextPage } from "@/components/TextPage";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({ title: "Règlement", description: "Le règlement du serveur Minecraft VÆLORIA : comportement, triche, Faction, sanctions.", path: "/rules" });

const BODY = `## 1. Comportement

- Respect envers tous les joueurs et le staff. Insultes graves, discriminations, menaces et harcèlement sont sanctionnés.
- Pas de publicité pour d'autres serveurs.
- Le chambrage fait partie du PvP ; l'acharnement et la haine non.

## 2. Triche et clients

- Interdits : clients de triche, macros, autoclickers, x-ray (packs ou mods), exploitation de bugs et dupe.
- Autorisés : mods d'optimisation et d'affichage sans avantage de jeu (liste détaillée : [À CONFIRMER]).
- Un bug trouvé doit être signalé au staff via le [support](/support). Le signaler peut être récompensé ; l'exploiter est sanctionné.

## 3. Faction

- Le raid, le vol et la trahison font partie du jeu.
- Interdits : piéger le spawn, bloquer l'accès d'une zone d'événement, multi-comptes pour contourner les limites de faction ou de Power.

## 4. Boutique

- Les achats ne donnent aucun avantage de combat.
- Une fraude au paiement (rétrofacturation abusive) entraîne la suspension du compte.

## 5. Sanctions

Avertissement, mute, kick, ban temporaire ou définitif selon la gravité et la récidive. Toute sanction peut être contestée via le [support](/support).`;

export default function RulesPage() {
  return <TextPage title="Règlement" path="/rules" eyebrow="Règles" description="Un serveur compétitif n'a de valeur que si les règles sont appliquées pour tous." body={BODY} />;
}
