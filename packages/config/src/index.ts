/**
 * Constantes de marque et de réseau partagées par le site, l'admin et l'API.
 * Rien de secret ici : ce fichier est inclus dans le bundle navigateur.
 */
export const BRAND = {
  name: "VÆLORIA",
  asciiName: "Vaeloria",
  tagline: "LE RETOUR DE LA VRAIE GUERRE.",
  description:
    "Serveur Minecraft français Faction & PvP compétitif. Minecraft 1.21, combat inspiré du PvP 1.8, saisons classées, KOTH, Outposts et raids.",
  domain: "vaeloria.fr",
  siteUrl: "https://vaeloria.fr",
  serverIp: "play.vaeloria.fr",
  minecraftVersion: "1.21",
  locale: "fr_FR",
} as const;

export const LINKS = {
  // À remplacer par l'invitation définitive.
  discord: "https://discord.gg/vaeloria",
  tiktok: "https://www.tiktok.com/@vaeloria",
  youtube: "https://www.youtube.com/@vaeloria",
  instagram: "https://www.instagram.com/vaeloria",
} as const;

/** Catégories de classement exposées par l'API et le site. */
export const LEADERBOARD_CATEGORIES = [
  { id: "factions", label: "Factions", unit: "pts" },
  { id: "kills", label: "Kills", unit: "kills" },
  { id: "wealth", label: "Richesse", unit: "$" },
  { id: "power", label: "Power", unit: "power" },
  { id: "territory", label: "Territoire", unit: "claims" },
  { id: "koth", label: "KOTH", unit: "captures" },
  { id: "activity", label: "Activité", unit: "h" },
] as const;

export type LeaderboardCategory = (typeof LEADERBOARD_CATEGORIES)[number]["id"];

export const LEADERBOARD_IDS = LEADERBOARD_CATEGORIES.map((c) => c.id) as [
  LeaderboardCategory,
  ...LeaderboardCategory[],
];
