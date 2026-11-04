import "server-only";
import { periods, type GscRow } from "@/lib/seo/gsc";
import { keywordRegex, type TrackedKeyword } from "@/lib/seo/keywords";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gscSession } from "./google/search-console";

export interface KeywordData {
  /** null : table absente (migration à exécuter). */
  tracked: TrackedKeyword[] | null;
  gsc:
    | { ok: false; status: string; message?: string }
    | {
        ok: true;
        range: ReturnType<typeof periods>;
        current: GscRow[];
        previous: GscRow[];
        pairs: GscRow[];
        allQueries: GscRow[];
      };
}

/** Mots-clés suivis et leurs données Search Console sur `days` jours (et la période d'avant). */
export async function keywordData(days: number): Promise<KeywordData> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("seo_keywords")
    .select("id, keyword, target_path, intent, priority, notes")
    .order("priority")
    .order("keyword");
  const tracked = error ? null : ((data as TrackedKeyword[] | null) ?? []);

  const s = await gscSession();
  if (!s.ok) return { tracked, gsc: { ok: false, status: s.status, message: s.message } };
  const range = periods(days);
  const regex = keywordRegex((tracked ?? []).map((k) => k.keyword));
  const filter = regex
    ? [{ filters: [{ dimension: "query", operator: "includingRegex", expression: regex }] }]
    : null;
  try {
    const [current, previous, pairs, allQueries] = await Promise.all([
      filter
        ? s.query({
            startDate: range.current.start,
            endDate: range.current.end,
            dimensions: ["query"],
            dimensionFilterGroups: filter,
            rowLimit: 1000,
          })
        : Promise.resolve([]),
      filter
        ? s.query({
            startDate: range.previous.start,
            endDate: range.previous.end,
            dimensions: ["query"],
            dimensionFilterGroups: filter,
            rowLimit: 1000,
          })
        : Promise.resolve([]),
      filter
        ? s.query({
            startDate: range.current.start,
            endDate: range.current.end,
            dimensions: ["query", "page"],
            dimensionFilterGroups: filter,
            rowLimit: 2000,
          })
        : Promise.resolve([]),
      s.query({
        startDate: range.current.start,
        endDate: range.current.end,
        dimensions: ["query"],
        rowLimit: 500,
      }),
    ]);
    return { tracked, gsc: { ok: true, range, current, previous, pairs, allQueries } };
  } catch (e) {
    return { tracked, gsc: { ok: false, status: "error", message: (e as Error).message } };
  }
}
