import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../src/db";
import type { VoteFetch } from "../src/services/votes/verifiers";
import { ADMIN_TOKEN, INTERNAL_TOKEN, activeSeason, ev, freshDb, signedHeaders, testApp } from "./helpers";

let sql: Sql;
let app: FastifyInstance;
const admin = { authorization: `Bearer ${ADMIN_TOKEN}` };
const tokens: Record<string, string> = {};
const as = (name: string, ip = "203.0.113.10") => ({ authorization: `Session ${tokens[name]!}`, "x-internal-token": INTERNAL_TOKEN, "x-vaeloria-client-ip": ip });

/** Faux sites de vote : IP → a voté. */
const voters = new Set<string>();
const calls: string[] = [];
let down = false;
const voteFetch: VoteFetch = async (url) => {
  calls.push(url);
  if (down) throw new Error("timeout");
  const voted = [...voters].some((ip) => url.includes(encodeURIComponent(ip)));
  if (url.startsWith("https://serveur-prive.net/")) return { ok: true, status: 200, text: async () => JSON.stringify({ success: voted }) };
  if (url.startsWith("https://serveur-minecraft.com/")) return { ok: true, status: 200, text: async () => JSON.stringify({ vote: voted ? 1 : 0 }) };
  return { ok: true, status: 200, text: async () => (voted ? "1" : "0") };
};

const bridge = (events: object[]) => {
  const body = JSON.stringify({ events });
  return app.inject({ method: "POST", url: "/bridge/v1/events", payload: body, headers: signedHeaders(body) });
};
async function player(name: string, uuid: string) {
  const res = await app.inject({ method: "POST", url: "/internal/v1/auth/dev-login", headers: { "x-internal-token": INTERNAL_TOKEN }, payload: { name } });
  tokens[name] = res.json().token;
  await bridge([ev({ event: "PLAYER_JOIN", uuid, username: name })]);
  const body = JSON.stringify({ uuid, username: name });
  const { code } = (await app.inject({ method: "POST", url: "/bridge/v1/link-codes", payload: body, headers: signedHeaders(body) })).json();
  const r = await app.inject({ method: "POST", url: "/api/v1/me/link", headers: as(name), payload: { code } });
  expect(r.statusCode, r.body).toBe(200);
}
const claim = (name: string, site: string, ip?: string) => app.inject({ method: "POST", url: `/api/v1/me/server-votes/${site}/claim`, headers: as(name, ip), payload: {} });
const influence = async (name: string) => (await app.inject({ url: "/api/v1/me/world", headers: as(name) })).json().influence as number;

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";

beforeAll(async () => {
  sql = await freshDb();
  await activeSeason(sql);
  app = await testApp(sql, { voteFetch });
  await player("Arthur", P1);
  await player("Brenna", P2);
});
afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("votes pour le serveur", () => {
  it("n'affiche aucun site tant qu'ils ne sont pas activés", async () => {
    const page = (await app.inject({ url: "/api/v1/vote" })).json();
    expect(page.sites).toEqual([]);
    expect(page.month.total).toBe(0);
  });

  it("l'admin configure les trois sites ; la clé de vérification n'est jamais publique", async () => {
    const { items } = (await app.inject({ url: "/admin/v1/world/vote-sites", headers: admin })).json();
    expect(items.map((s: { key: string }) => s.key)).toEqual(["serveur-prive", "serveur-minecraft", "liste-serveurs-minecraft"]);
    for (const s of items) {
      const r = await app.inject({ method: "PUT", url: `/admin/v1/world/vote-sites/${s.id}`, headers: admin, payload: {
        key: s.key, name: s.name, voteUrl: `${s.vote_url}vaeloria`, verifier: s.verifier, verificationKey: `KEY-${s.key}`, votifierService: s.votifier_service,
        cooldownMinutes: s.cooldown_minutes, rewardLabel: "1 clé de vote", rewardCommand: s.key === "serveur-prive" ? "crate key give {username} vote 1" : null, position: s.position, active: true,
      } });
      expect(r.statusCode, r.body).toBe(200);
    }
    const page = (await app.inject({ url: "/api/v1/vote" })).json();
    expect(page.sites).toHaveLength(3);
    expect(page.sites[0]).toMatchObject({ key: "serveur-prive", verifiable: true, rewardLabel: "1 clé de vote", cooldownMinutes: 90 });
    expect(JSON.stringify(page)).not.toContain("KEY-");
  });

  it("refuse « J'ai voté » si le site ne trouve pas de vote", async () => {
    const r = await claim("Arthur", "serveur-prive");
    expect(r.statusCode).toBe(409);
    expect(r.json().error.code).toBe("not_voted");
    expect(calls.at(-1)).toBe("https://serveur-prive.net/api/v1/servers/KEY-serveur-prive/votes/203.0.113.10");
  });

  it("vérifie le vote avec l'IP relayée par le site, récompense et applique le délai", async () => {
    voters.add("203.0.113.10");
    const before = await influence("Arthur");
    const r = await claim("Arthur", "serveur-prive");
    expect(r.statusCode, r.body).toBe(200);
    expect(r.json().influence).toBe(2);
    expect(await influence("Arthur")).toBe(before + 2);
    // Récompense en jeu : commande en file, joueur connecté requis
    const [cmd] = await sql`SELECT command, require_online, source FROM minecraft_commands WHERE source = 'vote'`;
    expect(cmd).toMatchObject({ command: "crate key give Arthur vote 1", require_online: true });
    // Deuxième clic : délai de revote, sans rappeler le site
    const n = calls.length;
    const again = await claim("Arthur", "serveur-prive");
    expect(again.statusCode).toBe(409);
    expect(again.json().error).toMatchObject({ code: "cooldown", details: { nextAt: expect.any(String) } });
    expect(calls.length).toBe(n);
  });

  it("utilise le bon format pour chaque site", async () => {
    expect((await claim("Arthur", "serveur-minecraft")).statusCode).toBe(200);
    expect(calls.at(-1)).toBe("https://serveur-minecraft.com/api/1/vote/KEY-serveur-minecraft/203.0.113.10/json");
    expect((await claim("Arthur", "liste-serveurs-minecraft")).statusCode).toBe(200);
    expect(calls.at(-1)).toBe("https://api.liste-serveurs-minecraft.org/vote/vote_verification.php?server_id=KEY-liste-serveurs-minecraft&ip=203.0.113.10&duration=5");
  });

  it("un même vote (même IP) ne peut pas être revendiqué par un autre joueur", async () => {
    const r = await claim("Brenna", "serveur-prive", "203.0.113.10");
    expect(r.statusCode).toBe(409);
    expect(r.json().error.code).toBe("ip_used");
  });

  it("ignore l'IP relayée sans le jeton interne (pas d'usurpation depuis l'extérieur)", async () => {
    const r = await app.inject({ method: "POST", url: "/api/v1/me/server-votes/serveur-minecraft/claim", headers: { authorization: `Session ${tokens.Brenna}`, "x-vaeloria-client-ip": "203.0.113.10" }, payload: {} });
    expect(r.json().error.code).toBe("not_voted");
    expect(calls.at(-1)).toContain("/127.0.0.1/");
  });

  it("site de vote injoignable : erreur claire, rien n'est enregistré", async () => {
    down = true;
    const r = await claim("Brenna", "serveur-minecraft", "198.51.100.7");
    down = false;
    expect(r.statusCode).toBe(503);
    expect(r.json().error.code).toBe("unavailable");
  });

  it("compte sans Minecraft lié : refusé avec la marche à suivre", async () => {
    const res = await app.inject({ method: "POST", url: "/internal/v1/auth/dev-login", headers: { "x-internal-token": INTERNAL_TOKEN }, payload: { name: "Sansmc" } });
    tokens.Sansmc = res.json().token;
    const r = await claim("Sansmc", "serveur-prive");
    expect(r.statusCode).toBe(403);
    expect(r.json().error.code).toBe("not_linked");
  });

  it("vote Votifier en jeu : compté une fois, partagé avec le délai du site", async () => {
    const before = await influence("Brenna");
    const e = ev({ event: "SERVER_VOTE", service: "serveur-prive.net", username: "brenna", address: "198.51.100.7" });
    expect((await bridge([e])).json()).toMatchObject({ accepted: 1 });
    expect((await bridge([e])).json()).toMatchObject({ duplicates: 1 }); // rejeu
    // Deuxième vote Votifier dans le délai : journalisé, non compté
    await bridge([ev({ event: "SERVER_VOTE", service: "SERVEUR-PRIVE.NET", username: "Brenna" })]);
    const [{ n }] = await sql`SELECT count(*)::int AS n FROM server_votes WHERE player_uuid = ${P2}`;
    expect(n).toBe(1);
    expect(await influence("Brenna")).toBe(before + 2);
    // Le bouton du site voit le vote déjà compté
    voters.add("198.51.100.7");
    expect((await claim("Brenna", "serveur-prive", "198.51.100.7")).json().error.code).toBe("cooldown");
  });

  it("Votifier : service inconnu ou pseudo jamais vu → ignoré sans erreur", async () => {
    const r = await bridge([
      ev({ event: "SERVER_VOTE", service: "autre-site.fr", username: "Arthur" }),
      ev({ event: "SERVER_VOTE", service: "serveur-minecraft.com", username: "pseudo avec espaces" }),
    ]);
    expect(r.json()).toMatchObject({ accepted: 2, failed: [] });
  });

  it("état personnel et classement du mois", async () => {
    const mine = (await app.inject({ url: "/api/v1/me/server-votes", headers: as("Arthur") })).json();
    expect(mine.player).toMatchObject({ username: "Arthur" });
    expect(mine.monthVotes).toBe(3);
    expect(mine.sites.every((s: { nextAt: string | null }) => s.nextAt)).toBe(true);
    const page = (await app.inject({ url: "/api/v1/vote" })).json();
    expect(page.month.total).toBe(4);
    expect(page.month.top).toEqual([{ username: "Arthur", votes: 3 }, { username: "Brenna", votes: 1 }]);
    const stats = (await app.inject({ url: "/admin/v1/world/votes", headers: admin })).json();
    expect(stats.bySite[0]).toMatchObject({ name: "Serveur-Privé", month: 2, web: 1, votifier: 1 });
    expect(stats.recent).toHaveLength(4);
  });
});
