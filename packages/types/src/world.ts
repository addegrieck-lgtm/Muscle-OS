/** Contrats du monde V2 (fondateurs, empires, guerres, carte, Conseil, journal, roadmap). */

export interface FounderStats {
  count: number;
  cap: number;
  open: boolean;
  milestones: { threshold: number; title: string; description: string; reward: string | null; reached: boolean; reveal: string | null }[];
}

export interface FounderRow {
  number: number;
  name: string;
  username: string | null;
  empire: string | null;
  empireSlug: string | null;
  invites: number;
  influence: number;
}

export interface EmpireCard {
  slug: string;
  name: string;
  tag: string;
  motto: string;
  color: string;
  crest: string;
  recruiting: boolean;
  members: number;
  influence: number;
  territories: number;
  rank: number;
  wars: { won: number; lost: number; active: number };
  createdAt: string;
}

export interface EmpireDetail extends EmpireCard {
  description: string;
  factionName: string | null;
  roster: { name: string; role: "leader" | "officer" | "member"; founder: number | null; influence: number; username: string | null }[];
  history: { slug: string; title: string; status: string; startsAt: string; opponent: string; opponentSlug: string; won: boolean | null }[];
}

export interface WarSide {
  slug: string;
  name: string;
  tag: string;
  color: string;
  crest: string;
  score: number;
  territories: number;
}

export interface WarView {
  slug: string;
  title: string;
  status: "planned" | "active" | "ended" | "cancelled";
  startsAt: string;
  endsAt: string | null;
  attacker: WarSide;
  defender: WarSide;
  participants: number;
  winner: string | null;
  summary: string;
}

export interface WarDetail extends WarView {
  events: { kind: string; message: string; occurredAt: string }[];
}

export type ZoneKind = "spawn" | "neutral" | "koth" | "warzone" | "event" | "outpost";

export interface MapData {
  radius: number;
  cellBlocks: number;
  zones: { key: string; name: string; kind: ZoneKind; x1: number; z1: number; x2: number; z2: number; description: string }[];
  territories: { slug: string; name: string; color: string; cx: number; cz: number; chunks: number }[];
  liveEvents: { slug: string; title: string; type: string; zoneKey: string | null }[];
  activeWars: { slug: string; title: string }[];
}

export interface RankingEntry {
  rank: number;
  name: string;
  href: string | null;
  value: number;
  secondary: string | null;
  color: string | null;
}

export interface PollView {
  slug: string;
  question: string;
  description: string;
  status: "open" | "closed";
  closesAt: string | null;
  eligibility: "account" | "linked";
  outcome: string | null;
  totalVotes: number;
  options: { id: string; label: string; votes: number; percent: number }[];
}

export interface JournalEntry {
  slug: string;
  episode: number | null;
  title: string;
  kind: "video" | "short" | "update" | "coulisses" | "milestone";
  summary: string;
  body: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}

export interface RoadmapStep {
  key: string;
  title: string;
  summary: string;
  details: string;
  status: "done" | "current" | "upcoming";
  eta: string | null;
}

export interface MyWorld {
  founder: number | null;
  referral: { code: string | null; clicks: number; registered: number; qualified: number };
  empire: { slug: string; name: string; role: "leader" | "officer" | "member"; inviteCode: string | null; recruiting: boolean } | null;
  votes: Record<string, string>;
  linked: boolean;
  influence: number;
}

/** Blasons et couleurs autorisés (partagés API ↔ site). */
export const CRESTS = ["chevron", "losange", "couronne", "etoile", "lame", "tour", "flamme", "croix"] as const;
export const EMPIRE_COLORS = ["#d21f2f", "#e2c27f", "#c3c7cf", "#4f8fdc", "#3fae7a", "#9b6bd6", "#e07a3f", "#3fb6b0", "#d65a9b", "#8a9a5b"] as const;

/** Catégories de /classements (partagées API ↔ site). */
export const RANKING_CATEGORIES = [
  { id: "empires", label: "Empires", description: "Puissance globale : influence et territoires", unit: "influence" },
  { id: "guerriers", label: "Guerriers", description: "Performance PvP de la saison", unit: "kills" },
  { id: "richesse", label: "Richesse", description: "Économie des factions", unit: "$" },
  { id: "territoires", label: "Territoires", description: "Chunks contrôlés", unit: "claims" },
  { id: "guerres", label: "Guerres", description: "Victoires de guerre", unit: "victoires" },
  { id: "saison", label: "Saison", description: "Performance globale de la saison", unit: "pts" },
  { id: "recruteurs", label: "Recruteurs", description: "Recrues qualifiées", unit: "recrues" },
] as const;

/** Vote pour le serveur sur les sites de classement (/vote). */
export interface VoteSiteView {
  key: string;
  name: string;
  voteUrl: string;
  cooldownMinutes: number;
  rewardLabel: string;
  /** Le bouton « J'ai voté » peut vérifier le vote (sinon : comptabilisé en jeu via Votifier). */
  verifiable: boolean;
}

export interface VotePage {
  sites: VoteSiteView[];
  /** Mois en cours (UTC) : total et meilleurs voteurs. */
  month: { start: string; total: number; top: { username: string; votes: number }[] };
}

export interface MyServerVotes {
  player: { uuid: string; username: string } | null;
  sites: { key: string; lastVotedAt: string | null; nextAt: string | null }[];
  monthVotes: number;
}
