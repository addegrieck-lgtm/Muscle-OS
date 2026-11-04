import "server-only";
import { siteUrl } from "@/lib/env";
import {
  dailySeries,
  opportunities,
  periods,
  pickProperty,
  splitByPeriod,
  totals,
  type GscRow,
} from "@/lib/seo/gsc";
import { googleAccessToken, readServiceAccount } from "./auth";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API = "https://www.googleapis.com/webmasters/v3";

async function call<T>(token: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const j = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(j.error?.message ?? `HTTP ${res.status}`);
  return j;
}

export interface Sitemap {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  errors?: string;
  warnings?: string;
  contents?: { type: string; submitted?: string }[];
}

export type GscReport =
  | { status: "unconfigured" }
  | { status: "no-access"; email: string; sites: string[] }
  | { status: "error"; message: string; email?: string }
  | {
      status: "ok";
      email: string;
      property: string;
      range: ReturnType<typeof periods>;
      current: ReturnType<typeof totals>;
      previous: ReturnType<typeof totals>;
      series: ReturnType<typeof dailySeries>;
      queries: GscRow[];
      pages: GscRow[];
      devices: GscRow[];
      opportunities: ReturnType<typeof opportunities>;
      sitemaps: Sitemap[];
    };

/** Tableau de bord Search Console des `days` derniers jours disponibles. */
export async function searchConsoleReport(days: number): Promise<GscReport> {
  const sa = readServiceAccount();
  if (!sa) return { status: "unconfigured" };
  try {
    const token = await googleAccessToken(sa, SCOPE);
    const { siteEntry = [] } = await call<{
      siteEntry?: { siteUrl: string; permissionLevel: string }[];
    }>(token, `${API}/sites`);
    const property = pickProperty(siteEntry, new URL(siteUrl).hostname);
    if (!property)
      return {
        status: "no-access",
        email: sa.client_email,
        sites: siteEntry.map((s) => s.siteUrl),
      };

    const base = `${API}/sites/${encodeURIComponent(property)}`;
    const range = periods(days);
    const q = (dimensions: string[], rowLimit: number, start = range.current.start) =>
      call<{ rows?: GscRow[] }>(token, `${base}/searchAnalytics/query`, {
        startDate: start,
        endDate: range.current.end,
        dimensions,
        rowLimit,
        dataState: "all",
      }).then((r) => r.rows ?? []);

    const [daily, queries, pages, devices, pairs, sm] = await Promise.all([
      q(["date"], 500, range.previous.start),
      q(["query"], 50),
      q(["page"], 50),
      q(["device"], 5),
      q(["query", "page"], 500),
      call<{ sitemap?: Sitemap[] }>(token, `${base}/sitemaps`).then((r) => r.sitemap ?? []),
    ]);
    const split = splitByPeriod(daily, range);
    return {
      status: "ok",
      email: sa.client_email,
      property,
      range,
      current: totals(split.current),
      previous: totals(split.previous),
      series: dailySeries(split.current, range.current),
      queries,
      pages,
      devices,
      opportunities: opportunities(pairs),
      sitemaps: sm,
    };
  } catch (e) {
    return { status: "error", message: (e as Error).message, email: sa.client_email };
  }
}

export interface Inspection {
  verdict?: string;
  coverageState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
  robotsTxtState?: string;
  pageFetchState?: string;
}

/** État d'indexation d'une adresse selon Google (outil d'inspection d'URL). */
export async function inspectUrl(url: string): Promise<Inspection | { error: string }> {
  const sa = readServiceAccount();
  if (!sa) return { error: "Search Console n’est pas connecté." };
  try {
    const token = await googleAccessToken(sa, SCOPE);
    const { siteEntry = [] } = await call<{
      siteEntry?: { siteUrl: string; permissionLevel: string }[];
    }>(token, `${API}/sites`);
    const property = pickProperty(siteEntry, new URL(siteUrl).hostname);
    if (!property) return { error: "Le compte de service n’a pas accès à la propriété." };
    const r = await call<{ inspectionResult?: { indexStatusResult?: Inspection } }>(
      token,
      "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      { inspectionUrl: url, siteUrl: property, languageCode: "fr-FR" },
    );
    return r.inspectionResult?.indexStatusResult ?? { error: "Réponse vide de Google." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
