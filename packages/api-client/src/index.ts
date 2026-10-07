import type { LeaderboardCategory } from "@vaeloria/config";
import type {
  FactionProfile,
  GameEvent,
  Incident,
  Leaderboard,
  NewsArticle,
  Paginated,
  PlayerProfile,
  Product,
  Season,
  ServerStatus,
  ServiceStatus,
} from "@vaeloria/types";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Options de cache transmises à `fetch` (Next.js comprend `next.revalidate`). */
export type CacheHint = { revalidate?: number | false; tags?: string[] };

export interface ApiClientOptions {
  baseUrl: string;
  /** En-têtes ajoutés à chaque requête (ex. clé admin côté serveur uniquement). */
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export function createApiClient({ baseUrl, headers, timeoutMs = 4000 }: ApiClientOptions) {
  const root = baseUrl.replace(/\/$/, "");

  async function get<T>(path: string, cache: CacheHint = { revalidate: 30 }): Promise<T> {
    const res = await fetch(`${root}${path}`, {
      headers: { accept: "application/json", ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      // Extension Next.js ; ignorée par les autres environnements.
      next: cache,
    } as RequestInit);
    if (!res.ok) {
      let code = "http_error";
      let message = res.statusText;
      try {
        const body = (await res.json()) as { error?: { code?: string; message?: string } };
        code = body.error?.code ?? code;
        message = body.error?.message ?? message;
      } catch {
        /* corps non JSON */
      }
      throw new ApiClientError(res.status, code, message);
    }
    return (await res.json()) as T;
  }

  const enc = encodeURIComponent;

  return {
    get,
    serverStatus: () => get<ServerStatus>("/api/v1/server/status", { revalidate: 15, tags: ["status"] }),
    services: () => get<{ services: ServiceStatus[]; incidents: Incident[] }>("/api/v1/server/services", { revalidate: 30 }),
    season: () => get<{ current: Season | null; upcoming: Season | null }>("/api/v1/season", { revalidate: 60, tags: ["season"] }),
    leaderboards: (limit = 10) => get<{ boards: Leaderboard[] }>(`/api/v1/leaderboards?limit=${limit}`, { revalidate: 60, tags: ["leaderboards"] }),
    leaderboard: (category: LeaderboardCategory, page = 1) =>
      get<Leaderboard>(`/api/v1/leaderboards/${enc(category)}?page=${page}`, { revalidate: 60, tags: ["leaderboards"] }),
    player: (username: string) => get<PlayerProfile>(`/api/v1/player/${enc(username)}`, { revalidate: 60 }),
    faction: (name: string) => get<FactionProfile>(`/api/v1/faction/${enc(name)}`, { revalidate: 60 }),
    events: () => get<{ items: GameEvent[] }>("/api/v1/events", { revalidate: 60, tags: ["events"] }),
    news: (page = 1, category?: string) =>
      get<Paginated<NewsArticle>>(`/api/v1/news?page=${page}${category ? `&category=${enc(category)}` : ""}`, { revalidate: 120, tags: ["news"] }),
    article: (slug: string) => get<NewsArticle>(`/api/v1/news/${enc(slug)}`, { revalidate: 300, tags: ["news"] }),
    products: () => get<{ items: Product[] }>("/api/v1/shop/products", { revalidate: 300, tags: ["shop"] }),
    stats: () => get<{ players: number; factions: number; kills: number; betaSignups: number }>("/api/v1/stats", { revalidate: 120 }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Exécute un appel API et renvoie `null` en cas d'échec (le site reste affichable sans API). */
export async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch {
    return null;
  }
}
