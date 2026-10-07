import { createServer, type Server } from "node:net";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../src/db";
import { pingMinecraft } from "../src/lib/minecraftPing";
import { ADMIN_TOKEN, freshDb, testApp } from "./helpers";

let sql: Sql;
let app: FastifyInstance;

beforeAll(async () => {
  sql = await freshDb();
  app = await testApp(sql);
});
afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("API site & publique", () => {
  it("statut « inconnu » sans heartbeat ni ping : aucun chiffre inventé", async () => {
    const s = (await app.inject({ url: "/api/v1/server/status" })).json();
    expect(s).toMatchObject({ state: "unknown", online: null, source: "none" });
  });

  it("classements vides sans saison active", async () => {
    const r = (await app.inject({ url: "/api/v1/leaderboards" })).json();
    expect(r.boards).toHaveLength(7);
    expect(r.boards.every((b: { entries: unknown[] }) => b.entries.length === 0)).toBe(true);
  });

  it("refuse une catégorie de classement inconnue", async () => {
    expect((await app.inject({ url: "/api/v1/leaderboards/inexistant" })).statusCode).toBe(400);
  });

  it("joueur introuvable → 404, pseudo invalide → 400", async () => {
    expect((await app.inject({ url: "/api/v1/player/Personne" })).statusCode).toBe(404);
    expect((await app.inject({ url: "/api/v1/player/a" })).statusCode).toBe(400);
  });

  it("inscription bêta : 201 puis 409 pour le même pseudo (insensible à la casse)", async () => {
    const body = { minecraftUsername: "Steve", consent: true };
    expect((await app.inject({ method: "POST", url: "/api/v1/beta", payload: body })).statusCode).toBe(201);
    expect((await app.inject({ method: "POST", url: "/api/v1/beta", payload: { ...body, minecraftUsername: "STEVE" } })).statusCode).toBe(409);
    expect((await app.inject({ method: "POST", url: "/api/v1/beta", payload: { minecraftUsername: "Alex" } })).statusCode).toBe(400);
  });

  it("analytics accepte sendBeacon (text/plain) et rejette les noms inconnus", async () => {
    const ok = await app.inject({ method: "POST", url: "/api/v1/analytics", headers: { "content-type": "text/plain" }, payload: JSON.stringify({ name: "copy_ip", visitorId: "abc12345", utm: { source: "tiktok" } }) });
    expect(ok.statusCode).toBe(204);
    const [row] = await sql`SELECT utm_source FROM analytics_events WHERE name = 'copy_ip'`;
    expect(row!.utm_source).toBe("tiktok");
    expect((await app.inject({ method: "POST", url: "/api/v1/analytics", payload: { name: "hack" } })).statusCode).toBe(400);
  });

  it("API publique : CORS ouvert et rate limit", async () => {
    const res = await app.inject({ url: "/public/v1/status" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["x-ratelimit-limit"]).toBe("30");
    let last = 200;
    for (let i = 0; i < 31; i++) last = (await app.inject({ url: "/public/v1/players" })).statusCode;
    expect(last).toBe(429);
  });

  it("admin protégé par jeton", async () => {
    expect((await app.inject({ url: "/admin/v1/dashboard" })).statusCode).toBe(401);
    expect((await app.inject({ url: "/admin/v1/dashboard", headers: { authorization: "Bearer mauvais" } })).statusCode).toBe(401);
    const ok = await app.inject({ url: "/admin/v1/dashboard", headers: { authorization: `Bearer ${ADMIN_TOKEN}` } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().kpi.betaSignups).toBe(1);
  });

  it("admin : publication d'un article visible ensuite sur /news", async () => {
    const auth = { authorization: `Bearer ${ADMIN_TOKEN}` };
    const created = await app.inject({ method: "POST", url: "/admin/v1/news", headers: auth, payload: { slug: "saison-1", title: "Saison I — Ouverture", category: "actualites", status: "published", body: "Texte" } });
    expect(created.statusCode).toBe(201);
    expect((await app.inject({ url: "/api/v1/news/saison-1" })).json().title).toBe("Saison I — Ouverture");
  });

  it("OpenAPI disponible hors production", async () => {
    const spec = (await app.inject({ url: "/docs/openapi.json" })).json();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.paths["/bridge/v1/events"]).toBeDefined();
  });
});

describe("Server List Ping", () => {
  let server: Server;
  let port: number;
  beforeAll(async () => {
    // Faux serveur Minecraft qui répond au paquet de statut.
    server = createServer((socket) => {
      socket.once("data", () => {
        const json = Buffer.from(JSON.stringify({ version: { name: "Paper 1.21" }, players: { online: 7, max: 100 }, description: { text: "§6VÆLORIA", extra: [{ text: " PvP" }] } }));
        const varInt = (n: number) => { const b: number[] = []; do { let x = n & 0x7f; n >>>= 7; if (n) x |= 0x80; b.push(x); } while (n); return Buffer.from(b); };
        const body = Buffer.concat([varInt(0), varInt(json.length), json]);
        socket.end(Buffer.concat([varInt(body.length), body]));
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as { port: number }).port;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("lit joueurs, version et MOTD", async () => {
    const r = await pingMinecraft("127.0.0.1", port);
    expect(r).toMatchObject({ online: 7, max: 100, version: "Paper 1.21", motd: "VÆLORIA PvP" });
  });

  it("échoue proprement si le serveur est injoignable", async () => {
    await expect(pingMinecraft("127.0.0.1", 1, 500)).rejects.toThrow();
  });
});
