import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../src/db";
import { activeSeason, ev, freshDb, signedHeaders, testApp } from "./helpers";

let sql: Sql;
let app: FastifyInstance;

beforeAll(async () => {
  sql = await freshDb();
  await activeSeason(sql);
  app = await testApp(sql);
});
afterAll(async () => {
  await app.close();
  await sql.end();
});

const post = (url: string, payload: object, headers?: Record<string, string>) => {
  const body = JSON.stringify(payload);
  return app.inject({ method: "POST", url, payload: body, headers: headers ?? signedHeaders(body) });
};

const alice = { uuid: "11111111-1111-4111-8111-111111111111", username: "Alice" };
const bob = { uuid: "22222222-2222-4222-8222-222222222222", username: "Bob_" };

describe("sécurité du bridge", () => {
  it("rejette une requête non signée", async () => {
    const res = await app.inject({ method: "POST", url: "/bridge/v1/events", payload: { events: [] } });
    expect(res.statusCode).toBe(401);
  });

  it("rejette une signature calculée avec un mauvais secret", async () => {
    const body = JSON.stringify({ events: [ev({ event: "PLAYER_JOIN", ...alice })] });
    const res = await post("/bridge/v1/events", {}, signedHeaders(body, { secret: "x".repeat(64) }));
    expect(res.statusCode).toBe(401);
  });

  it("rejette un corps modifié après signature", async () => {
    const signed = JSON.stringify({ events: [ev({ event: "PLAYER_JOIN", ...alice })] });
    const tampered = JSON.stringify({ events: [ev({ event: "PLAYER_JOIN", ...bob })] });
    const res = await app.inject({ method: "POST", url: "/bridge/v1/events", payload: tampered, headers: signedHeaders(signed) });
    expect(res.statusCode).toBe(401);
  });

  it("rejette un horodatage trop ancien", async () => {
    const body = JSON.stringify({ events: [ev({ event: "PLAYER_JOIN", ...alice })] });
    const res = await app.inject({ method: "POST", url: "/bridge/v1/events", payload: body, headers: signedHeaders(body, { timestamp: Date.now() - 10 * 60_000 }) });
    expect(res.statusCode).toBe(401);
  });

  it("rejette le rejeu d'un nonce", async () => {
    const body = JSON.stringify({ events: [ev({ event: "PLAYER_JOIN", ...alice })] });
    const headers = signedHeaders(body);
    expect((await app.inject({ method: "POST", url: "/bridge/v1/events", payload: body, headers })).statusCode).toBe(200);
    const replay = await app.inject({ method: "POST", url: "/bridge/v1/events", payload: body, headers });
    expect(replay.statusCode).toBe(401);
    expect(replay.json().error.message).toMatch(/rejeu/);
  });

  it("valide le schéma des événements", async () => {
    const res = await post("/bridge/v1/events", { events: [ev({ event: "PLAYER_JOIN", uuid: "pas-un-uuid", username: "Alice" })] });
    expect(res.statusCode).toBe(400);
  });
});

describe("ingestion des événements", () => {
  it("est idempotente : un événement renvoyé n'est compté qu'une fois", async () => {
    const kill = ev({ event: "PLAYER_KILL", killer: alice, victim: bob });
    const first = await post("/bridge/v1/events", { events: [kill] });
    expect(first.json()).toMatchObject({ accepted: 1, duplicates: 0 });
    const second = await post("/bridge/v1/events", { events: [kill] });
    expect(second.json()).toMatchObject({ accepted: 0, duplicates: 1 });

    const [s] = await sql`SELECT kills FROM player_season_stats WHERE player_uuid = ${alice.uuid}`;
    expect(s!.kills).toBe(1);
  });

  it("alimente le profil joueur et le classement", async () => {
    await post("/bridge/v1/events", { events: [ev({ event: "PLAYER_KILL", killer: alice, victim: bob }), ev({ event: "PLAYER_KILL", killer: bob, victim: alice })] });
    const profile = await app.inject({ url: "/api/v1/player/alice" });
    expect(profile.statusCode).toBe(200);
    expect(profile.json().stats).toMatchObject({ kills: 2, deaths: 1, kd: 2 });

    const lb = await app.inject({ url: "/api/v1/leaderboards/kills" });
    expect(lb.json().entries[0]).toMatchObject({ rank: 1, name: "Alice", value: 2 });
  });

  it("suit le pseudo par UUID (changement de pseudo)", async () => {
    await post("/bridge/v1/events", { events: [ev({ event: "PLAYER_JOIN", uuid: alice.uuid, username: "AliceV2" })] });
    expect((await app.inject({ url: "/api/v1/player/AliceV2" })).json().uuid).toBe(alice.uuid);
    expect((await app.inject({ url: `/api/v1/player/${alice.uuid}` })).json().username).toBe("AliceV2");
  });

  it("gère le cycle de vie d'une faction", async () => {
    await post("/bridge/v1/events", {
      events: [
        ev({ event: "FACTION_CREATE", faction: "Ordre", leader: alice, occurredAt: "2026-01-01T00:00:00.000Z" }),
        ev({ event: "FACTION_JOIN", faction: "Ordre", ...bob, role: "MEMBER", occurredAt: "2026-01-01T00:00:01.000Z" }),
        ev({ event: "FACTION_CLAIM", faction: "Ordre", world: "world", chunkX: 1, chunkZ: 2, occurredAt: "2026-01-01T00:00:02.000Z" }),
        ev({ event: "FACTION_SNAPSHOT", faction: "Ordre", power: 40, maxPower: 60, wealth: 1000, claims: 1, occurredAt: "2026-01-01T00:00:03.000Z" }),
      ],
    });
    const f = (await app.inject({ url: "/api/v1/faction/ordre" })).json();
    expect(f).toMatchObject({ name: "Ordre", claims: 1, power: 40, rank: 1 });
    expect(f.members).toHaveLength(2);
    expect(f.leader.uuid).toBe(alice.uuid);
  });

  it("un heartbeat rend le serveur « en ligne » via le bridge", async () => {
    await post("/bridge/v1/events", { events: [ev({ event: "SERVER_HEARTBEAT", online: 42, maxPlayers: 300, tps: 19.8, version: "Paper 1.21" })] });
    const status = (await app.inject({ url: "/api/v1/server/status" })).json();
    expect(status).toMatchObject({ state: "online", online: 42, source: "bridge" });
  });
});

describe("file de commandes", () => {
  it("distribue, accuse et ne redistribue pas une commande livrée", async () => {
    await sql`INSERT INTO minecraft_commands (player_uuid, command, source, idempotency_key) VALUES (${alice.uuid}, 'say hello', 'test', ${randomUUID()})`;
    const claimed = (await post("/bridge/v1/commands/claim", { server: "factions" })).json().commands;
    expect(claimed).toHaveLength(1);
    expect((await post("/bridge/v1/commands/claim", { server: "factions" })).json().commands).toHaveLength(0);

    const ack = await post(`/bridge/v1/commands/${claimed[0].id}/ack`, { status: "DELIVERED" });
    expect(ack.json().result).toBe("ok");
    const dup = await post(`/bridge/v1/commands/${claimed[0].id}/ack`, { status: "DELIVERED" });
    expect(dup.json().result).toBe("already_final");
  });

  it("redistribue une commande dont le bail a expiré (plugin planté)", async () => {
    const [c] = await sql`INSERT INTO minecraft_commands (player_uuid, command, source, idempotency_key) VALUES (${alice.uuid}, 'say lease', 'test', ${randomUUID()}) RETURNING id`;
    await post("/bridge/v1/commands/claim", { server: "factions" });
    await sql`UPDATE minecraft_commands SET lease_until = now() - interval '1 second' WHERE id = ${c!.id}`;
    const again = (await post("/bridge/v1/commands/claim", { server: "factions" })).json().commands;
    expect(again.map((x: { id: string }) => x.id)).toContain(c!.id);
    expect(again[0].retryCount).toBe(2);
  });

  it("DEFERRED remet en file sans consommer de tentative", async () => {
    await sql`UPDATE minecraft_commands SET status = 'CANCELLED' WHERE status <> 'DELIVERED'`;
    const [c] = await sql`INSERT INTO minecraft_commands (player_uuid, command, source, idempotency_key, require_online) VALUES (${alice.uuid}, 'give', 'test', ${randomUUID()}, true) RETURNING id`;
    await post("/bridge/v1/commands/claim", { server: "factions" });
    await post(`/bridge/v1/commands/${c!.id}/ack`, { status: "DEFERRED" });
    const [row] = await sql`SELECT status, retry_count FROM minecraft_commands WHERE id = ${c!.id}`;
    expect(row).toMatchObject({ status: "PENDING", retry_count: 0 });
  });
});

describe("joueurs en ligne", () => {
  it("ignore les joueurs d'un serveur silencieux", async () => {
    await post("/bridge/v1/events", { events: [ev({ event: "PLAYER_JOIN", uuid: bob.uuid, username: bob.username }), ev({ event: "SERVER_HEARTBEAT", online: 1, maxPlayers: 100, tps: 20, version: "Paper 1.21" })] });
    expect((await app.inject({ url: "/api/v1/server/players" })).json().players.map((p: { username: string }) => p.username)).toContain("Bob_");
    await sql`UPDATE server_status SET updated_at = now() - interval '5 minutes'`;
    const fresh = await testApp(sql); // nouveau cache
    expect((await fresh.inject({ url: "/api/v1/server/players" })).json().count).toBe(0);
    await fresh.close();
  });
});
