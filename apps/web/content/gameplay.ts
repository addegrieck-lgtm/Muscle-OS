/**
 * Règles de jeu affichées sur le site, recopiées des configurations des plugins du serveur :
 * VaeloriaVote 1.0.0, VaeloriaFactions 1.0.0, VaeloriaShop 1.0.0, VaeloriaCombat 0.1.0.
 * Quand une config change en jeu, mettre à jour la valeur ici (une seule source pour tout le site).
 */

// ── VaeloriaVote (config.yml) ────────────────────────────────────────

export interface VoteSite {
  id: string;
  name: string;
  /** Lien de vote. Vide tant que le site n'est pas choisi : la carte affiche « bientôt ». */
  url: string;
  cooldownMinutes: number;
}

/** Les 3 sites de vote. Remplacer nom + lien en même temps que `sites:` dans VaeloriaVote/config.yml. */
export const VOTE_SITES: VoteSite[] = [
  // url : page de vote de VÆLORIA sur chaque site, à renseigner après l'inscription du serveur.
  { id: "site1", name: "Serveur Privé", url: "", cooldownMinutes: 1440 },
  { id: "site2", name: "Serveur Minecraft", url: "", cooldownMinutes: 1440 },
  { id: "site3", name: "Liste Serveurs Minecraft", url: "", cooldownMinutes: 1440 },
];

export const VOTE = {
  perVote: { money: 300, items: [["Steak cuit", 8], ["Fioles d'expérience", 4]] as [string, number][] },
  allSitesBonus: { money: 500, items: [["Pomme dorée", 1], ["Carottes dorées", 8]] as [string, number][] },
  maxMoneyPerDay: 6000,
  reminderMinutes: 30,
  wheel: {
    requiredSites: 3,
    classic: { 1: 50, 2: 35, 3: 15 } as Record<number, number>,
    risky: { 4: 40, 0: 60 } as Record<number, number>,
  },
} as const;

/** Chances en % d'une roue (poids → pourcentage) et moyenne attendue. */
export function wheelOdds(weights: Record<number, number>) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const rows = Object.entries(weights)
    .map(([mult, w]) => ({ multiplier: Number(mult), percent: Math.round((w / total) * 1000) / 10 }))
    .sort((a, b) => a.multiplier - b.multiplier);
  const average = rows.reduce((s, r) => s + (r.multiplier * r.percent) / 100, 0);
  return { rows, average: Math.round(average * 100) / 100 };
}

/** Cagnotte d'une journée complète (3 votes + bonus), avant multiplicateur. */
export const dailyPot = () => VOTE.perVote.money * VOTE_SITES.length + VOTE.allSitesBonus.money;

export const formatCooldown = (minutes: number) =>
  minutes % 1440 === 0 ? `${minutes / 1440 === 1 ? "24 h" : `${minutes / 1440} j`}` : minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ""}` : `${minutes} min`;

// ── VaeloriaFactions (config.yml) ────────────────────────────────────

export const FACTIONS = {
  costs: { create: 10_000, rename: 25_000, declareWar: 50_000 },
  maxMembers: 20,
  nameLength: [3, 16] as const,
  power: { start: 5, max: 10, min: -10, regenPerMinute: 0.2, lossOnDeath: 4, warzoneMultiplier: 1.5 },
  claims: { perPower: 1, max: 120, maxRadius: 5 },
  raid: { lockMinutes: 10, breachMinutes: 15 },
  shield: { hours: 6, changeCooldownHours: 72 },
  obsidian: { shardsPerObsidian: 9, deepslateChancePercent: 3 },
  relations: { maxAllies: 2, maxTruces: 4 },
  teleport: { warmupSeconds: 5, enemyRadius: 16, maxWarps: 3 },
  flyEnemyRadius: 32,
  combatTagSeconds: 15,
  totem: { breakSeconds: 7.5, durationMinutes: 30, reward: 75_000, schedule: ["Mercredi 20 h 30", "Samedi 21 h"] },
  koth: { holdMinutes: 5, durationMinutes: 30, reward: 60_000, schedule: ["Dimanche 18 h"] },
  outposts: { captureMinutes: 2, incomePerHour: 9_000, powerBonus: 2 },
  war: { preparationMinutes: 15, durationHours: 48, cooldownHours: 72, minMembers: 2, points: { kill: 1, raid: 5, overclaim: 10 } },
  missionsPerDay: 3,
  missions: [
    ["Tuer 20 joueurs ennemis", 15_000],
    ["Tuer 250 monstres", 6_000],
    ["Miner 256 minerais", 8_000],
    ["Miner 96 minerais de deepslate", 10_000],
    ["Détruire 300 blocs ennemis à la TNT", 20_000],
    ["Cumuler 10 h de jeu entre membres", 5_000],
    ["Capturer un avant-poste", 12_000],
  ] as [string, number][],
  upgrades: [
    { name: "Claims", effect: "+10 claims", costs: [25_000, 60_000, 125_000, 250_000, 500_000] },
    { name: "Power", effect: "+5 power", costs: [50_000, 120_000, 250_000, 500_000, 1_000_000] },
    { name: "Coffre", effect: "+1 rangée", costs: [20_000, 60_000, 150_000] },
    { name: "Bouclier", effect: "+1 h par jour", costs: [150_000, 400_000] },
    { name: "Warps", effect: "+1 warp", costs: [15_000, 40_000, 90_000] },
    { name: "Membres", effect: "+5 places", costs: [75_000, 200_000] },
  ],
} as const;

// ── VaeloriaShop (config.yml + shop.yml) ─────────────────────────────

export const MERCHANT_RANKS = [
  { name: "Colporteur", threshold: 0, bonus: 0, perks: "Houe de moisson I, graines, blocs" },
  { name: "Marchand", threshold: 20_000, bonus: 2, perks: "Premiers générateurs, houe II, hache, baguette de vente, livres enchantés" },
  { name: "Négociant", threshold: 120_000, bonus: 4, perks: "Pioche des abysses, obsidienne, cochon, creeper, enderman" },
  { name: "Maître marchand", threshold: 500_000, bonus: 6, perks: "Houe III, vache, blaze, Raccommodage" },
  { name: "Baron du négoce", threshold: 2_000_000, bonus: 8, perks: "Générateur de golem de fer" },
  { name: "Prince marchand", threshold: 7_500_000, bonus: 10, perks: "Le titre suprême du commerce" },
] as const;

export const GENERATORS = [
  { mob: "Zombie", price: 15_000, rank: 2, income: 220 },
  { mob: "Squelette", price: 50_000, rank: 2, income: 760 },
  { mob: "Araignée", price: 55_000, rank: 2, income: 870 },
  { mob: "Poulet", price: 65_000, rank: 2, income: 1_000 },
  { mob: "Cochon", price: 110_000, rank: 3, income: 1_600 },
  { mob: "Creeper", price: 110_000, rank: 3, income: 1_600 },
  { mob: "Enderman", price: 140_000, rank: 3, income: 2_000 },
  { mob: "Blaze", price: 180_000, rank: 4, income: 2_400 },
  { mob: "Vache", price: 200_000, rank: 4, income: 2_800 },
  { mob: "Golem de fer", price: 1_000_000, rank: 5, income: 9_600 },
] as const;

export const TOOLS = [
  { name: "Houe de moisson I", price: 2_500, rank: 1, effect: "Récolte, replante et ramasse tout seul" },
  { name: "Hache du bûcheron", price: 12_000, rank: 2, effect: "Abat l'arbre entier d'un coup (96 bûches max.)" },
  { name: "Houe de moisson II", price: 20_000, rank: 2, effect: "Récolte et replante en 3×3" },
  { name: "Baguette de vente", price: 8_000, rank: 2, effect: "Vend un coffre entier d'un clic (100 utilisations)" },
  { name: "Pioche des abysses", price: 90_000, rank: 3, effect: "Mine en 3×3, Efficacité V, Fortune II" },
  { name: "Houe de moisson III", price: 150_000, rank: 4, effect: "Récolte et replante en 5×5" },
  { name: "Grande baguette de vente", price: 30_000, rank: 4, effect: "Vend un coffre entier d'un clic (500 utilisations)" },
] as const;

export const MARKET = {
  maxResalePercent: 80,
  featuredCount: 3,
  featuredBonus: 25,
  maxDropPercent: 50,
  halfLifeHours: 8,
  obsidian: { price: 2_500, rank: 3, dailyLimit: 8 },
  hdv: { durationHours: 48, listingFeePercent: 1, saleTaxPercent: 5, taxDiscountPerRank: 0.5, listingsByRank: [3, 4, 5, 6, 8, 10] },
  playerShops: {
    plots: 16,
    saleTaxPercent: 3,
    maxWeeksAhead: 4,
    graceHours: 48,
    tiers: [
      { name: "Échoppe", rent: 15_000, offers: 14, rank: 2, estimate: "80 000 à 120 000 $ / semaine" },
      { name: "Boutique", rent: 35_000, offers: 21, rank: 3, estimate: "150 000 à 250 000 $ / semaine" },
      { name: "Grande enseigne", rent: 75_000, offers: 28, rank: 4, estimate: "300 000 à 500 000 $ / semaine" },
    ],
  },
  incomeBenchmarks: [
    ["Débutant, houe I, à la main", "1 500 à 3 000 $/h"],
    ["Champs + houe II/III, fermes automatiques", "6 000 à 12 000 $/h"],
    ["Avant-poste tenu par ta faction", "9 000 $/h"],
  ] as [string, string][],
} as const;

export const rankName = (level: number) => MERCHANT_RANKS[Math.max(0, level - 1)]?.name ?? "—";

// ── VaeloriaCombat (config.yml) ──────────────────────────────────────

export const COMBAT = {
  noAttackCooldown: true,
  noSweep: true,
  hitDelayTicks: 20,
  knockback: { horizontal: 0.4, vertical: 0.4, verticalLimit: 0.4, ignoreResistance: true },
  degradedSimulationDistance: 3,
} as const;

// ── Commandes joueur des 4 plugins ───────────────────────────────────

export const COMMANDS: { group: string; items: [string, string][] }[] = [
  {
    group: "Votes",
    items: [
      ["/vote", "Les 3 sites, ce qui est votable et ta cagnotte du jour"],
      ["/vote verifier", "« J'ai voté » : vérifie tes votes auprès des sites"],
      ["/roue classique", "Roue du jour : ×1, ×2 ou ×3, jamais de perte"],
      ["/roue risque", "Quitte ou double : ×4 ou rien"],
    ],
  },
  {
    group: "Faction",
    items: [
      ["/f creer ‹nom›", `Fonder une faction (${FACTIONS.costs.create.toLocaleString("fr-FR")} $)`],
      ["/f inviter ‹joueur›", "Inviter un joueur (invitation valable 10 minutes)"],
      ["/f claim [rayon]", "Revendiquer le chunk (ou un rayon jusqu'à 5)"],
      ["/f sethome · /f home", "Point de retour de la faction (5 s d'attente, pas d'ennemi à 16 blocs)"],
      ["/f ennemi ‹faction›", "Déclarer l'inimitié : ouvre le surclaim"],
      ["/f fly", "Voler dans ton territoire (coupé si un ennemi est à 32 blocs)"],
      ["/f", "Menu complet de la faction : banque, coffre, améliorations, missions"],
    ],
  },
  {
    group: "Économie",
    items: [
      ["/shop", "Le marché de VÆLORIA (alias /boutique, /marche)"],
      ["/vendre [main|tout]", "Vendre l'objet en main ou tout ton inventaire"],
      ["/prix", "Prix de rachat de l'objet en main"],
      ["/marchand", "Ton rang de marchand et le classement"],
      ["/hdv", "Hôtel des ventes entre joueurs"],
      ["/hdv vendre ‹prix› [quantité]", "Mettre en vente l'objet en main"],
      ["/pshop", "Boutiques de joueurs de la spawn"],
    ],
  },
  {
    group: "PvP",
    items: [
      ["/ping [joueur]", "Ton ping et sa stabilité"],
      ["/pvpstatus", "Santé du serveur pour le PvP : TPS, MSPT, ping moyen"],
    ],
  },
];
