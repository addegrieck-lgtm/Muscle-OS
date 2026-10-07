/**
 * Objets renvoyés par l'API au site et à l'admin.
 * `null` signifie « donnée inconnue » (ex. serveur jamais contacté) — le site
 * affiche alors un état neutre plutôt qu'un chiffre inventé.
 */
import type { LeaderboardCategory } from "@vaeloria/config";

export type ServerState = "online" | "offline" | "maintenance" | "unknown";

export interface ServerStatus {
  state: ServerState;
  online: number | null;
  maxPlayers: number | null;
  version: string | null;
  motd: string | null;
  latencyMs: number | null;
  source: "bridge" | "ping" | "none";
  checkedAt: string;
}

export interface ServiceStatus {
  id: "website" | "api" | "minecraft" | "factions" | "database" | "discord-bot";
  label: string;
  state: "operational" | "degraded" | "down" | "unknown";
  latencyMs: number | null;
  detail?: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: "minor" | "major" | "critical" | "maintenance";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  startedAt: string;
  resolvedAt: string | null;
  body: string;
}

export interface Season {
  id: string;
  number: number;
  name: string;
  status: "upcoming" | "active" | "ended";
  startsAt: string;
  endsAt: string | null;
  description: string;
  rewards: { rank: string; reward: string }[];
  objectives: string[];
  stats: { players: number; factions: number };
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  value: number;
  secondary?: string | null;
}

export interface Leaderboard {
  category: LeaderboardCategory;
  seasonId: string | null;
  updatedAt: string;
  entries: LeaderboardEntry[];
  total: number;
}

export interface PlayerProfile {
  uuid: string;
  username: string;
  rank: string | null;
  faction: { name: string; role: string } | null;
  stats: {
    kills: number;
    deaths: number;
    kd: number;
    power: number | null;
    balance: number | null;
    playtimeSeconds: number;
    kothCaptures: number;
  };
  firstSeenAt: string;
  lastSeenAt: string | null;
  achievements: { id: string; label: string; unlockedAt: string }[];
  /** Compte VÆLORIA lié (null si le joueur n'a pas lié son compte). */
  founder: number | null;
  empire: { slug: string; name: string; tag: string; color: string; crest: string; role: string } | null;
  wars: { won: number; lost: number };
  badges: { id: string; label: string }[];
}

export interface FactionProfile {
  id: string;
  name: string;
  description: string | null;
  leader: { uuid: string; username: string } | null;
  members: { uuid: string; username: string; role: string }[];
  power: number;
  maxPower: number;
  claims: number;
  kills: number;
  wealth: number;
  kothCaptures: number;
  rank: number | null;
  createdAt: string;
}

export interface GameEvent {
  id: string;
  slug: string;
  title: string;
  type: "koth" | "boss" | "tournament" | "supply_drop" | "war" | "seasonal" | "gold_rush" | "siege" | "other";
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  rewards: string | null;
  /** En cours maintenant (début passé, fin non atteinte). */
  live: boolean;
  /** Réels uniquement (synchronisés depuis le serveur), null tant qu'inconnus. */
  participants: number | null;
  empiresCount: number | null;
  zoneKey: string | null;
}

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: "actualites" | "minecraft" | "pvp" | "factions" | "guides" | "serveur";
  coverUrl: string | null;
  author: string;
  publishedAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: "cosmetics" | "ranks" | "effects" | "tags" | "pets" | "bundles";
  priceCents: number;
  currency: "EUR";
  imageUrl: string | null;
  active: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}
