import { describe, expect, it } from "vitest";
import { auditPage, auditSite, wordCount, withSuffix } from "@/lib/seo/audit";
import { cleanPath, deviceOf, isBot, referrerHost, sourceOf } from "@/lib/services/traffic";

const none = { title: new Set<string>(), description: new Set<string>() };

describe("audit SEO", () => {
  it("note bien une page complète", () => {
    const a = auditPage(
      {
        path: "/produit/x",
        kind: "produit",
        name: "Halo",
        title: withSuffix("Halo — lustre LED anneaux en cascade pour escalier"),
        description:
          "Lustre design Halo : anneaux d’acrylique fumé cerclés de LED, de 3 à 48 anneaux, pour escalier et double hauteur.",
        text: "mot ".repeat(150),
        minWords: 120,
        keywords: ["Halo"],
        images: [{ alt: "Lustre Halo allumé dans un escalier" }],
        structured: true,
      },
      none,
    );
    expect(a.score).toBe(100);
  });
  it("signale titre trop long, description absente, contenu court, alt manquant, doublon", () => {
    const pages = [
      {
        path: "/a",
        kind: "page" as const,
        name: "A",
        title: "x".repeat(80),
        description: "",
        text: "deux mots",
        minWords: 100,
        images: [{ alt: "" }],
      },
      {
        path: "/b",
        kind: "page" as const,
        name: "B",
        title: "x".repeat(80),
        description: "",
        text: "",
      },
    ];
    const { audits, errors } = auditSite(pages);
    const a = audits.find((x) => x.path === "/a")!;
    const sev = Object.fromEntries(a.checks.map((c) => [c.id, c.severity]));
    expect(sev).toMatchObject({
      title: "warn",
      description: "error",
      "title-dup": "error",
      content: "error",
      images: "warn",
    });
    expect(a.score).toBeLessThan(40);
    expect(errors).toBeGreaterThan(0);
  });
  it("compte les mots avec apostrophes et accents", () => {
    expect(wordCount("L’éclairage d’une pièce, c’est 3 choses.")).toBe(6);
  });
});

describe("mesure d'audience", () => {
  it("écarte robots et chemins internes", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari")).toBe(false);
    expect(cleanPath("/admin/dashboard")).toBeNull();
    expect(cleanPath("/produit/halo?x=1#a")).toBe("/produit/halo");
    expect(cleanPath("https://evil")).toBeNull();
  });
  it("classe appareil et source", () => {
    expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari")).toBe("mobile");
    expect(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0)")).toBe("tablet");
    expect(sourceOf(referrerHost("https://www.google.fr/search?q=lustre", "lumeance.fr"))).toBe(
      "search",
    );
    expect(sourceOf(referrerHost("https://l.instagram.com/", "lumeance.fr"))).toBe("social");
    expect(referrerHost("https://lumeance.fr/collections", "lumeance.fr")).toBeNull();
    expect(sourceOf(null)).toBe("direct");
  });
});

describe("mesure d'audience : visites de l'équipe exclues", async () => {
  const { hasAuthCookie, isExcludedDevice } = await import("@/lib/services/traffic");
  it("reconnaît l'appareil exclu et la session Supabase", () => {
    expect(isExcludedDevice("a=1; lumeance_no_stats=1")).toBe(true);
    expect(isExcludedDevice("lumeance_no_stats=1")).toBe(true);
    expect(isExcludedDevice("lumeance_no_stats=0; x=lumeance_no_stats=1x")).toBe(false);
    expect(isExcludedDevice(null)).toBe(false);
    expect(hasAuthCookie("sb-abcd-auth-token=base64-xyz")).toBe(true);
    expect(hasAuthCookie("x=1; sb-abcd-auth-token.0=part")).toBe(true);
    expect(hasAuthCookie("lumeance.cart=1")).toBe(false);
  });
});
