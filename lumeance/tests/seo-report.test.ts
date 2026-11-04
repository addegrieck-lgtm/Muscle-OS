import { describe, expect, it } from "vitest";
import type { GscRow } from "@/lib/seo/gsc";
import {
  buildAlerts,
  clickLosses,
  movers,
  positionChanges,
  validCronToken,
  type ReportFacts,
} from "@/lib/seo/report";

const r = (k: string, clicks: number, impressions: number, position: number): GscRow => ({
  keys: [k],
  clicks,
  impressions,
  ctr: 0,
  position,
});

const base: ReportFacts = {
  gsc: { ok: true, clicks: 10, clicksBefore: 10 },
  drops: [],
  losses: [],
  auditErrors: 0,
  brokenLinks: 0,
  orphans: 0,
  lostBacklinks: 0,
  articlesToReview: 0,
  scheduledSoon: 0,
  supplierGaps: 0,
  indexable: true,
};

describe("rapport SEO", () => {
  it("repère reculs, progrès et pertes de clics", () => {
    const m = movers(
      [r("lustre escalier", 1, 30, 14), r("applique", 2, 20, 4), r("rare", 0, 2, 30)],
      [r("lustre escalier", 3, 30, 8), r("applique", 2, 20, 9), r("rare", 0, 2, 5)],
    );
    const { drops, gains } = positionChanges(m);
    expect(drops.map((x) => x.key)).toEqual(["lustre escalier"]);
    expect(gains.map((x) => x.key)).toEqual(["applique"]);
    expect(
      clickLosses(movers([r("/a", 2, 50, 5)], [r("/a", 10, 50, 5)])).map((x) => x.key),
    ).toEqual(["/a"]);
    expect(clickLosses(movers([r("/a", 8, 50, 5)], [r("/a", 10, 50, 5)]))).toEqual([]);
  });

  it("ne crée des alertes qu'à partir de faits", () => {
    expect(buildAlerts(base)).toEqual([]);
    const a = buildAlerts({
      ...base,
      gsc: { ok: true, clicks: 2, clicksBefore: 20 },
      brokenLinks: 1,
      lostBacklinks: 2,
      articlesToReview: 3,
      indexable: false,
    });
    expect(a.filter((x) => x.level === "critique")).toHaveLength(3);
    expect(a.some((x) => x.text.includes("2 lien(s) externe(s) perdu(s)"))).toBe(true);
    expect(buildAlerts({ ...base, gsc: { ok: false } })[0]!.text).toMatch(/non connecté/);
  });

  it("protège la tâche planifiée par un secret robuste", () => {
    const secret = "s".repeat(32);
    expect(validCronToken(`Bearer ${secret}`, secret)).toBe(true);
    expect(validCronToken(`Bearer ${"x".repeat(32)}`, secret)).toBe(false);
    expect(validCronToken(null, secret)).toBe(false);
    expect(validCronToken("Bearer court", "court")).toBe(false);
    expect(validCronToken(`Bearer ${secret}`, undefined)).toBe(false);
  });
});
