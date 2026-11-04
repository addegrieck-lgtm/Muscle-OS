import { vi } from "vitest";
vi.mock("server-only", () => ({}));
import { describe, expect, it } from "vitest";
import {
  dailySeries,
  opportunities,
  periods,
  pickProperty,
  splitByPeriod,
  totals,
  type GscRow,
} from "@/lib/seo/gsc";
import { readServiceAccount, signedAssertion } from "@/lib/services/google/auth";

const row = (keys: string[], clicks: number, impressions: number, position: number): GscRow => ({
  keys,
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
});

describe("Search Console : calculs", () => {
  it("découpe deux périodes consécutives, décalées du retard de Google", () => {
    const p = periods(7, new Date("2026-11-10T12:00:00Z"));
    expect(p.current).toEqual({ start: "2026-11-01", end: "2026-11-07" });
    expect(p.previous).toEqual({ start: "2026-10-25", end: "2026-10-31" });
  });

  it("calcule les totaux (position pondérée) et laisse vide sans impression", () => {
    const t = totals([row(["a"], 2, 100, 4), row(["b"], 0, 300, 12)]);
    expect(t.clicks).toBe(2);
    expect(t.ctr).toBeCloseTo(0.005);
    expect(t.position).toBeCloseTo(10);
    expect(totals([])).toEqual({ clicks: 0, impressions: 0, ctr: null, position: null });
  });

  it("répartit les jours et complète la série sans inventer", () => {
    const p = periods(2, new Date("2026-11-10T00:00:00Z"));
    const rows = [row(["2026-11-06"], 1, 5, 9), row(["2026-11-04"], 3, 9, 9)];
    const s = splitByPeriod(rows, p);
    expect(s.current.map((r) => r.keys[0])).toEqual(["2026-11-06"]);
    expect(s.previous.map((r) => r.keys[0])).toEqual(["2026-11-04"]);
    expect(dailySeries(s.current, p.current)).toEqual([
      { date: "2026-11-06", clicks: 1, impressions: 5 },
      { date: "2026-11-07", clicks: 0, impressions: 0 },
    ]);
  });

  it("repère les recherches en page 2 et les pages bien placées mais peu cliquées", () => {
    const o = opportunities([
      row(["lustre escalier", "https://x.fr/luminaires/escalier"], 0, 40, 11),
      row(["luminaire design", "https://x.fr/"], 0, 50, 3),
      row(["rare", "https://x.fr/a"], 0, 3, 12),
      row(["top", "https://x.fr/b"], 10, 40, 2),
    ]);
    expect(o.map((x) => [x.kind, x.query])).toEqual([
      ["ctr", "luminaire design"],
      ["page2", "lustre escalier"],
    ]);
  });

  it("choisit la propriété du domaine", () => {
    const sites = [
      { siteUrl: "https://maisonlumeance.fr/", permissionLevel: "siteRestrictedUser" },
      { siteUrl: "sc-domain:maisonlumeance.fr", permissionLevel: "siteRestrictedUser" },
    ];
    expect(pickProperty(sites, "maisonlumeance.fr")).toBe("sc-domain:maisonlumeance.fr");
    expect(pickProperty(sites.slice(0, 1), "www.maisonlumeance.fr")).toBe(
      "https://maisonlumeance.fr/",
    );
    expect(pickProperty([], "maisonlumeance.fr")).toBeNull();
  });
});

describe("compte de service Google", () => {
  it("lit la clé (JSON ou base64) et signe une assertion vérifiable", async () => {
    const pair = (await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    )) as CryptoKeyPair;
    const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
    const pem = `-----BEGIN PRIVATE KEY-----\n${der.toString("base64")}\n-----END PRIVATE KEY-----\n`;
    const json = JSON.stringify({
      client_email: "seo@p.iam.gserviceaccount.com",
      private_key: pem,
    });
    expect(readServiceAccount(Buffer.from(json).toString("base64"))?.client_email).toBe(
      "seo@p.iam.gserviceaccount.com",
    );
    expect(readServiceAccount("n’importe quoi")).toBeNull();
    expect(readServiceAccount("")).toBeNull();

    const sa = readServiceAccount(json)!;
    const jwt = await signedAssertion(sa, "scope", Date.UTC(2026, 0, 1));
    const [h, c, sig] = jwt.split(".");
    const claims = JSON.parse(Buffer.from(c!, "base64url").toString());
    expect(claims).toMatchObject({ iss: sa.client_email, scope: "scope", exp: claims.iat + 3600 });
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      pair.publicKey,
      Buffer.from(sig!, "base64url"),
      new TextEncoder().encode(`${h}.${c}`),
    );
    expect(ok).toBe(true);
  });
});
