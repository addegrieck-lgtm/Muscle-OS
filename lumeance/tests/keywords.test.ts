import { describe, expect, it } from "vitest";
import type { GscRow } from "@/lib/seo/gsc";
import {
  cannibalized,
  discovered,
  KEYWORD_IDEAS,
  keywordIdeas,
  keywordRegex,
  normalizeKeyword,
  pagesByKeyword,
  positionBand,
  positionGain,
  statsByKeyword,
  statsOf,
} from "@/lib/seo/keywords";
import { ROOMS } from "@/lib/content/home";

const r = (keys: string[], clicks: number, impressions: number, position: number): GscRow => ({
  keys,
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

describe("mots-clés", () => {
  it("normalise et construit une expression exacte, caractères spéciaux échappés", () => {
    expect(normalizeKeyword("  Lustre   ESCALIER ")).toBe("lustre escalier");
    expect(keywordRegex(["lustre escalier", "Lustre escalier", "lustre (cristal)"])).toBe(
      "^(lustre escalier|lustre \\(cristal\\))$",
    );
    expect(keywordRegex([])).toBeNull();
    expect(new RegExp(keywordRegex(["a.b"])!).test("axb")).toBe(false);
  });

  it("agrège sans inventer : position pondérée, vide sans donnée", () => {
    const m = statsByKeyword([r(["lustre escalier"], 1, 10, 12), r(["Lustre escalier"], 0, 30, 8)]);
    expect(statsOf(m, "lustre escalier")).toMatchObject({
      impressions: 40,
      clicks: 1,
      position: 9,
    });
    expect(statsOf(m, "inconnu")).toEqual({ impressions: 0, clicks: 0, ctr: null, position: null });
    expect(positionBand(null)).toBe("absent");
    expect(positionBand(2.9)).toBe("top3");
    expect(positionBand(14)).toBe("page2");
    expect(positionGain(8, 12)).toBe(4);
    expect(positionGain(8, null)).toBeNull();
  });

  it("repère la cannibalisation et la page qui ressort", () => {
    const pages = pagesByKeyword([
      r(["lustre escalier", "https://x.fr/luminaires/escalier"], 0, 60, 9),
      r(["lustre escalier", "https://x.fr/collections/lustres"], 0, 40, 14),
      r(["applique", "https://x.fr/collections/appliques"], 0, 50, 5),
      r(["applique", "https://x.fr/"], 0, 2, 30),
    ]);
    expect(pages.get("lustre escalier")![0]!.path).toBe("/luminaires/escalier");
    expect(cannibalized(pages.get("lustre escalier")!)).toHaveLength(2);
    expect(cannibalized(pages.get("applique")!)).toHaveLength(0);
  });

  it("propose les recherches réelles non suivies et des pistes vers des pages existantes", () => {
    const d = discovered(
      [r(["lustre escalier"], 0, 50, 9), r(["suspension verre"], 0, 12, 20), r(["rare"], 0, 1, 40)],
      ["lustre escalier"],
    );
    expect(d.map((x) => x.keyword)).toEqual(["suspension verre"]);
    const paths = new Set(["/luminaires/escalier", "/"]);
    const ideas = keywordIdeas(["lustre escalier"], paths);
    expect(ideas.every((i) => paths.has(i.target))).toBe(true);
    expect(ideas.some((i) => i.keyword === "lustre escalier")).toBe(false);
  });

  it("les pistes visent des pages qui existent dans le code", () => {
    const known = new Set([
      "/",
      "/collections",
      "/collections/lustres",
      "/collections/suspensions",
      "/collections/appliques",
      ...ROOMS.map((x) => `/luminaires/${x.id}`),
    ]);
    for (const i of KEYWORD_IDEAS) {
      expect(known.has(i.target), i.target).toBe(true);
      expect(normalizeKeyword(i.keyword)).toBe(i.keyword);
    }
  });
});
