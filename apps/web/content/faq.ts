/**
 * FAQ de repli (affichée si l'API est indisponible, donc toujours dans l'export statique).
 * La version éditable vit dans l'admin. Les réponses suivent le stade réel du projet :
 * on n'annonce ni IP joignable ni date tant que ce n'est pas vrai.
 */
import { BRAND } from "@vaeloria/config";
import { IS_OPEN, STAGE, STAGE_SENTENCE } from "@/lib/launch";
import { FACTIONS } from "./gameplay";

const F = FACTIONS;

export const FALLBACK_FAQ: { question: string; answer: string }[] = [
  { question: "Le serveur VÆLORIA est-il ouvert ?", answer: STAGE_SENTENCE[STAGE] },
  {
    question: "Quelle est l'IP du serveur ?",
    answer: IS_OPEN
      ? `${BRAND.serverIp} — ajoute-la dans Multijoueur → Ajouter un serveur, en Minecraft Java ${BRAND.minecraftVersion}.`
      : "L'adresse sera publiée le jour de l'ouverture, sur le site et sur Discord. Aucune adresse ne permet de se connecter pour l'instant.",
  },
  {
    question: "Comment participer à la bêta ?",
    answer: "Les candidatures à la bêta passent par la page Bêta et le Discord. Les testeurs aident à régler le PvP, l'économie et les raids avant l'ouverture.",
  },
  { question: "Quelle version de Minecraft faut-il ?", answer: `Minecraft Java Edition ${BRAND.minecraftVersion}, sans mod ni launcher particulier. Le serveur ne prend pas en charge l'édition Bedrock.` },
  {
    question: "Le PvP est-il en 1.8 ?",
    answer: `Le jeu est en ${BRAND.minecraftVersion}, mais le combat suit les règles de la 1.8.9 : pas de recharge d'attaque, pas de coup balayé, invulnérabilité de 20 ticks et knockback 1.8.9. Inutile d'utiliser un client 1.8.9.`,
  },
  {
    question: "Comment fonctionne le Faction ?",
    answer: `Tu crées ou rejoins une faction, tu claims du territoire et tu construis ta base. Chaque joueur apporte du power (${F.power.start} au départ, ${F.power.max} au maximum) et en perd ${F.power.lossOnDeath} à chaque mort. Une faction dont le power passe sous son nombre de claims peut être surclaimée, et la TNT fonctionne dans les claims, même hors ligne.`,
  },
  {
    question: "Peut-on raid une base quand ses joueurs sont déconnectés ?",
    answer: `Oui : la TNT fonctionne dans les claims même hors ligne. L'obsidienne résiste à la TNT et ne tombe que par surclaim, et chaque faction dispose d'un bouclier de ${F.shield.hours} h par jour contre le surclaim.`,
  },
  { question: "Comment rejoindre le Discord ?", answer: "Depuis la page Discord du site. C'est là que sont publiées les annonces, la date d'ouverture, les événements et le support." },
];
