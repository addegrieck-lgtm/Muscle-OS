import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, siteUrl } from "@/lib/env";
import { FOOTER_NAV, MAIN_NAV } from "@/lib/navigation";
import { auditSite } from "@/lib/seo/audit";
import { periods, totals } from "@/lib/seo/gsc";
import { keywordRegex } from "@/lib/seo/keywords";
import { brokenLinks, linkGraph, linkStats, navigationPaths } from "@/lib/seo/linking";
import { articlesForProduct, roomsForProduct } from "@/lib/seo/linking";
import { auditProduct } from "@/lib/seo/product-audit";
import { buildAlerts, clickLosses, movers, positionChanges, type Alert } from "@/lib/seo/report";
import { sitePages } from "@/lib/seo/site-pages";
import { verifyBacklinkUrl } from "./backlink-check";
import { getCategories, getProducts } from "./catalog";
import { gscSession } from "./google/search-console";
import { listPublishedArticles } from "./journal";

const round = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

/**
 * Calcule le rapport de la semaine écoulée, l'enregistre et renvoie ses alertes. `db` : client de
 * la session administrateur (bouton) ou client de service (tâche planifiée).
 */
export async function generateSeoReport(db: SupabaseClient, trigger: "manuel" | "planifie") {
  const [all, categories, articles] = await Promise.all([
    getProducts(),
    getCategories(),
    listPublishedArticles(),
  ]);
  const products = all.filter((p) => !p.isDemo);
  const pages = sitePages(products, categories, articles);
  const audit = auditSite(pages);
  const edges = linkGraph({ products, categories, articles });
  const nav = navigationPaths([...MAIN_NAV, ...Object.values(FOOTER_NAV).flat()]);
  const paths = new Set([...pages.map((p) => p.path), "/collections", "/journal"]);
  const orphans = linkStats(
    pages.map((p) => p.path),
    edges,
  ).filter((s) => s.inbound === 0 && !nav.has(s.path) && s.path !== "/");
  const productAudits = products.map((p) =>
    auditProduct(p, {
      articles: articlesForProduct(articles, p.slug).length,
      rooms: roomsForProduct(products, p.slug).length,
      reviews: 0,
    }),
  );

  // Search Console : semaine écoulée contre la précédente.
  const range = periods(7);
  const s = await gscSession();
  const { data: kw } = await db.from("seo_keywords").select("keyword");
  const tracked = ((kw as { keyword: string }[] | null) ?? []).map((k) => k.keyword);
  let gsc: Record<string, unknown> | null = null;
  let drops: ReturnType<typeof positionChanges>["drops"] = [];
  let gains: ReturnType<typeof positionChanges>["gains"] = [];
  let losses: ReturnType<typeof clickLosses> = [];
  let keywords: { keyword: string; now: number | null; before: number | null }[] = [];
  if (s.ok) {
    try {
      const q = (dimensions: string[], r: { start: string; end: string }) =>
        s.query({ startDate: r.start, endDate: r.end, dimensions, rowLimit: 1000 });
      const [qNow, qBefore, pNow, pBefore] = await Promise.all([
        q(["query"], range.current),
        q(["query"], range.previous),
        q(["page"], range.current),
        q(["page"], range.previous),
      ]);
      const tNow = totals(pNow);
      const tBefore = totals(pBefore);
      gsc = {
        clicks: tNow.clicks,
        clicksBefore: tBefore.clicks,
        impressions: tNow.impressions,
        impressionsBefore: tBefore.impressions,
        position: round(tNow.position),
        positionBefore: round(tBefore.position),
      };
      const qm = movers(qNow, qBefore);
      ({ drops, gains } = positionChanges(qm));
      losses = clickLosses(movers(pNow, pBefore)).map((m) => ({
        ...m,
        key: new URL(m.key).pathname,
      }));
      const re = keywordRegex(tracked);
      keywords = re
        ? qm
            .filter((m) => new RegExp(re).test(m.key))
            .map((m) => ({ keyword: m.key, now: round(m.now), before: round(m.before) }))
        : [];
    } catch (e) {
      console.error("seo report gsc:", (e as Error).message);
    }
  }

  // Liens externes : revérifie les 5 liens obtenus les moins récemment contrôlés.
  const { data: links } = await db
    .from("backlinks")
    .select("id, source_url, status, checked_at")
    .eq("status", "obtenu")
    .order("checked_at", { ascending: true, nullsFirst: true })
    .limit(5);
  let rechecked = 0;
  for (const l of (links as { id: string; source_url: string }[] | null) ?? []) {
    const r = await verifyBacklinkUrl(l.source_url);
    const { message: _m, ...found } = r;
    void _m;
    await db
      .from("backlinks")
      .update({
        ...(r.check_status === "present" ? found : { check_status: r.check_status }),
        ...(r.check_status === "absent" ? { status: "perdu" } : {}),
        checked_at: new Date().toISOString(),
      })
      .eq("id", l.id);
    rechecked++;
  }
  const [{ count: lost }, { count: obtained }, { data: jr }] = await Promise.all([
    db.from("backlinks").select("id", { count: "exact", head: true }).eq("status", "perdu"),
    db.from("backlinks").select("id", { count: "exact", head: true }).eq("status", "obtenu"),
    db.from("journal_articles").select("status, published_at"),
  ]);
  const journalRows = (jr as { status: string; published_at: string | null }[] | null) ?? [];
  const soon = Date.now() + 7 * 864e5;
  const review = journalRows.filter((r) => r.status === "review").length;
  const scheduledSoon = journalRows.filter(
    (r) =>
      r.status === "published" &&
      r.published_at &&
      new Date(r.published_at).getTime() > Date.now() &&
      new Date(r.published_at).getTime() <= soon,
  ).length;
  const supplierGaps = productAudits.reduce(
    (n, a) => n + a.checks.filter((c) => c.supplier).length,
    0,
  );

  const alerts: Alert[] = buildAlerts({
    gsc: {
      ok: !!gsc,
      clicks: gsc?.clicks as number | undefined,
      clicksBefore: gsc?.clicksBefore as number | undefined,
    },
    drops,
    losses,
    auditErrors: audit.errors,
    brokenLinks: brokenLinks(edges, paths).length,
    orphans: orphans.length,
    lostBacklinks: lost ?? 0,
    articlesToReview: review,
    scheduledSoon,
    supplierGaps,
    indexable: publicEnv.NEXT_PUBLIC_INDEXABLE,
  });

  const data = {
    gsc,
    drops,
    gains,
    losses,
    keywords,
    audit: { score: audit.score, errors: audit.errors, pages: pages.length },
    products: {
      average: productAudits.length
        ? Math.round(productAudits.reduce((n, a) => n + a.score, 0) / productAudits.length)
        : 0,
      supplierGaps,
    },
    linking: { edges: edges.length, orphans: orphans.length },
    backlinks: { obtained: obtained ?? 0, lost: lost ?? 0, rechecked },
    journal: { published: articles.length, review, scheduledSoon },
    alerts,
  };
  const { data: saved, error } = await db
    .from("seo_reports")
    .insert({
      period_start: range.current.start,
      period_end: range.current.end,
      trigger,
      alerts: alerts.filter((a) => a.level !== "info").length,
      data,
    })
    .select("id")
    .single();
  if (error) throw new Error(`seo_reports: ${error.code} ${error.message}`);
  await sendReportEmail(alerts, data.audit.score, range.current).catch((e) =>
    console.error("seo report email:", (e as Error).message),
  );
  return { id: saved.id as string, alerts };
}

/**
 * Envoi facultatif par e-mail (API Brevo) si BREVO_API_KEY, REPORT_EMAIL_TO et
 * REPORT_EMAIL_FROM sont définis ; sinon le rapport reste consultable dans l'administration.
 */
async function sendReportEmail(
  alerts: Alert[],
  score: number,
  range: { start: string; end: string },
) {
  const key = process.env.BREVO_API_KEY;
  const to = process.env.REPORT_EMAIL_TO;
  const from = process.env.REPORT_EMAIL_FROM;
  if (!key || !to || !from) return;
  const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const items = alerts.length
    ? alerts.map((a) => `<li><strong>${a.level}</strong> — ${esc(a.text)}</li>`).join("")
    : "<li>Aucune alerte cette semaine.</li>";
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: "LUMÉANCE" },
      to: [{ email: to }],
      subject: `Rapport SEO du ${range.start} au ${range.end} — ${alerts.filter((a) => a.level === "critique").length} alerte(s) critique(s)`,
      htmlContent: `<p>Score d’audit du site : <strong>${score}/100</strong></p><ul>${items}</ul><p><a href="${siteUrl}/admin/rapports">Voir le rapport complet</a></p>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Brevo HTTP ${res.status}`);
}
