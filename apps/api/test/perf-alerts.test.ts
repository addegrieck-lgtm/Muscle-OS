import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Sql } from "../src/db";
import { notifyServerAlerts } from "../src/services/serverHealth";
import { ADMIN_TOKEN, ev, freshDb, signedHeaders, testApp } from "./helpers";

let sql: Sql;
let app: FastifyInstance;
const discord = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(null, { status: 204 }));

beforeAll(async () => {
  sql = await freshDb();
  app = await testApp(sql, { discordFetch: discord as unknown as typeof fetch }, { DISCORD_ALERTS_WEBHOOK_URL: "https://discord.test/api/webhooks/staff", LAG_ALERT_MSPT: "40", LAG_ALERT_MINUTES: "3" });
});
afterAll(async () => {
  await app.close();
  await sql.end();
});

const t0 = Date.now() - 10 * 60_000;
const at = (min: number) => new Date(t0 + min * 60_000).toISOString();
const heartbeat = (min: number, mspt: number, tps = 20) => {
  const body = JSON.stringify({ events: [ev({ event: "SERVER_HEARTBEAT", server: "pvp", online: 120, maxPlayers: 300, tps, mspt, version: "Paper 1.21", occurredAt: at(min) })] });
  return app.inject({ method: "POST", url: "/bridge/v1/events", payload: body, headers: signedHeaders(body) });
};
const alerts = () => sql`SELECT * FROM server_alerts WHERE server = 'pvp' ORDER BY started_at`;
const sentMessages = () => discord.mock.calls.map((c) => JSON.parse(String(c[1]?.body)).content as string);

describe("alertes de lag (MSPT)", () => {
  it("n'ouvre pas d'alerte pour un pic bref", async () => {
    await heartbeat(0, 55, 19.5);
    await heartbeat(2, 60, 19);
    expect(await alerts()).toHaveLength(0);
    const [s] = await sql`SELECT lag_since FROM server_status WHERE server = 'pvp'`;
    expect(new Date(s!.lag_since).toISOString()).toBe(at(0));
  });

  it("ouvre une alerte quand le lag dure et la publie sur Discord", async () => {
    await heartbeat(4, 72, 17.2);
    const [a] = await alerts();
    expect(a).toMatchObject({ peak_mspt: 72, min_tps: 17.2, resolved_at: null });
    expect(new Date(a!.started_at).toISOString()).toBe(at(0));
    await vi.waitFor(() => expect(discord).toHaveBeenCalledTimes(1));
    expect(discord.mock.calls[0]![0]).toBe("https://discord.test/api/webhooks/staff");
    expect(sentMessages()[0]).toMatch(/pvp.*MSPT élevé.*pic 72 ms\/tick, TPS min 17\.2/);
  });

  it("garde l'alerte ouverte entre les deux seuils (hystérésis) et suit le pic", async () => {
    await heartbeat(5, 90, 15);
    await heartbeat(6, 35, 20);
    const list = await alerts();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ peak_mspt: 90, min_tps: 15, resolved_at: null });
    expect(discord).toHaveBeenCalledTimes(1); // pas de doublon
  });

  it("résout l'alerte quand le MSPT redescend et l'annonce", async () => {
    await heartbeat(7, 18, 20);
    const [a] = await alerts();
    expect(new Date(a!.resolved_at).toISOString()).toBe(at(7));
    await vi.waitFor(() => expect(discord).toHaveBeenCalledTimes(2));
    expect(sentMessages()[1]).toMatch(/pvp.*lag terminé après 7 min.*pic 90/);
    const [s] = await sql`SELECT lag_since FROM server_status WHERE server = 'pvp'`;
    expect(s!.lag_since).toBeNull();
  });

  it("ignore un heartbeat ancien renvoyé en retard", async () => {
    await heartbeat(1, 99, 10);
    const list = await alerts();
    expect(list).toHaveLength(1);
    expect(list[0]!.resolved_at).not.toBeNull();
  });

  it("retente l'envoi Discord après un échec", async () => {
    await heartbeat(8, 80);
    await heartbeat(12, 80); // ouvre une 2e alerte, envoyée en arrière-plan par la route
    await vi.waitFor(() => expect(discord).toHaveBeenCalledTimes(3));
    // Rejeu déterministe de l'échec : on remet l'alerte « non envoyée » et on appelle directement l'envoi.
    await sql`UPDATE server_alerts SET notified_at = NULL WHERE resolved_at IS NULL`;
    const failing = vi.fn(async () => new Response(null, { status: 500 }));
    expect(await notifyServerAlerts(sql, "https://discord.test/x", failing as unknown as typeof fetch)).toBe(0);
    expect(failing).toHaveBeenCalledTimes(1);
    expect((await sql`SELECT notified_at FROM server_alerts WHERE resolved_at IS NULL`)[0]!.notified_at).toBeNull();
    const ok = vi.fn(async () => new Response(null, { status: 204 }));
    expect(await notifyServerAlerts(sql, "https://discord.test/x", ok as unknown as typeof fetch)).toBe(1);
    expect(await notifyServerAlerts(sql, "https://discord.test/x", ok as unknown as typeof fetch)).toBe(0);
  });

  it("expose l'état de lag et les alertes au tableau de bord admin", async () => {
    const d = (await app.inject({ url: "/admin/v1/dashboard", headers: { authorization: `Bearer ${ADMIN_TOKEN}` } })).json();
    expect(d.lagAlertMspt).toBe(40);
    expect(d.servers.find((s: { server: string }) => s.server === "pvp").lagSince).not.toBeNull();
    expect(d.alerts).toHaveLength(2);
    expect(d.alerts[0]).toMatchObject({ server: "pvp", peakMspt: 80, resolvedAt: null });
  });
});
