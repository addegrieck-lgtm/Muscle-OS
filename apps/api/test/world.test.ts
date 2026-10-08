import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../src/db";
import { seedWorld } from "../src/worldSeed";
import { ADMIN_TOKEN, activeSeason, devLogin, ev, freshDb, signedHeaders, testApp } from "./helpers";

let sql: Sql;
let app: FastifyInstance;
const admin = { authorization: `Bearer ${ADMIN_TOKEN}` };
const as = (token: string) => ({ authorization: `Session ${token}` });
const tokens: Record<string, string> = {};

async function login(name: string, referralCode?: string) {
  const res = await app.inject({ method: "POST", url: "/internal/v1/auth/dev-login", headers: { "x-internal-token": "internal-token-for-tests-0123456789" }, payload: { name, referralCode } });
  tokens[name] = res.json().token;
  return tokens[name]!;
}
const me = async (name: string) => (await app.inject({ url: "/api/v1/me/world", headers: as(tokens[name]!) })).json();
const bridge = (payload: object) => {
  const body = JSON.stringify(payload);
  return app.inject({ method: "POST", url: "/bridge/v1/events", payload: body, headers: signedHeaders(body) });
};
async function link(name: string, uuid: string, username: string) {
  const body = JSON.stringify({ uuid, username });
  const { code } = (await app.inject({ method: "POST", url: "/bridge/v1/link-codes", payload: body, headers: signedHeaders(body) })).json();
  const r = await app.inject({ method: "POST", url: "/api/v1/me/link", headers: as(tokens[name]!), payload: { code } });
  expect(r.statusCode, r.body).toBe(200);
}
const createEmpire = (name: string, payload: object) => app.inject({ method: "POST", url: "/api/v1/me/empire", headers: as(tokens[name]!), payload });

beforeAll(async () => {
  sql = await freshDb();
  await activeSeason(sql);
  await seedWorld(sql);
  app = await testApp(sql);
});
afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("fondateurs", () => {
  it("numérote les inscrits sans trou et une seule fois par compte", async () => {
    await login("Alpha");
    await login("Bravo");
    await login("Alpha"); // reconnexion : pas de nouveau numéro
    expect((await me("Alpha")).founder).toBe(1);
    expect((await me("Bravo")).founder).toBe(2);
    const stats = (await app.inject({ url: "/api/v1/founders" })).json();
    expect(stats).toMatchObject({ count: 2, cap: 3000, open: true });
    expect(stats.milestones[0]).toMatchObject({ threshold: 500, reached: false, reveal: null });
  });

  it("respecte le plafond et la fermeture configurés", async () => {
    await sql`UPDATE site_settings SET value = '3' WHERE key = 'founders.cap'`;
    await login("Charlie");
    await login("Delta");
    expect((await me("Charlie")).founder).toBe(3);
    expect((await me("Delta")).founder).toBeNull();
    await sql`UPDATE site_settings SET value = '3000' WHERE key = 'founders.cap'`;
  });

  it("ne révèle le contenu d'un palier qu'une fois atteint", async () => {
    await app.inject({ method: "PUT", url: "/admin/v1/world/milestones/500", headers: admin, payload: { threshold: 500, title: "Première étape communautaire", reveal: "Secret" } });
    await app.inject({ method: "POST", url: "/admin/v1/world/milestones", headers: admin, payload: { threshold: 2, title: "Test", reveal: "Révélé" } });
    const m = (await app.inject({ url: "/api/v1/founders" })).json().milestones;
    expect(m.find((x: { threshold: number }) => x.threshold === 2)).toMatchObject({ reached: true, reveal: "Révélé" });
    expect(m.find((x: { threshold: number }) => x.threshold === 500).reveal).toBeNull();
    await app.inject({ method: "DELETE", url: "/admin/v1/world/milestones/2", headers: admin });
  });
});

describe("parrainage et influence", () => {
  it("clic → inscription → qualification seulement après liaison Minecraft", async () => {
    const code = (await me("Alpha")).referral.code as string;
    expect(code).toMatch(/^[A-Z0-9]{7}$/);
    for (let i = 0; i < 3; i++) await app.inject({ method: "POST", url: "/api/v1/referrals/click", payload: { code, visitorKey: "visiteur-1234" } });
    await app.inject({ method: "POST", url: "/api/v1/referrals/click", payload: { code, visitorKey: "visiteur-5678" } });
    await login("Echo", code);
    let alpha = await me("Alpha");
    expect(alpha.referral).toMatchObject({ clicks: 2, registered: 1, qualified: 0 });
    const before = alpha.influence;

    await link("Echo", "11111111-1111-4111-8111-000000000001", "EchoMC");
    alpha = await me("Alpha");
    expect(alpha.referral.qualified).toBe(1);
    expect(alpha.influence - before).toBe(0); // Alpha n'a pas de compte Minecraft lié : règle « compte lié exigé »
  });

  it("l'influence de parrainage exige un parrain lié, et un compte Minecraft ne qualifie qu'une fois", async () => {
    await link("Bravo", "22222222-2222-4222-8222-000000000002", "BravoMC");
    const code = (await me("Bravo")).referral.code as string;
    await login("Foxtrot", code);
    const before = (await me("Bravo")).influence;
    await link("Foxtrot", "33333333-3333-4333-8333-000000000003", "FoxMC");
    expect((await me("Bravo")).influence - before).toBe(50);

    // Le même compte Minecraft relié à un autre compte VÆLORIA ne requalifie pas
    await login("Golf", code);
    await link("Golf", "33333333-3333-4333-8333-000000000003", "FoxMC");
    expect((await me("Bravo")).referral.qualified).toBe(1);
  });

  it("ignore l'auto-parrainage et un code inconnu", async () => {
    const code = (await me("Alpha")).referral.code as string;
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM user_referrals WHERE code = ${code}`) as unknown as [{ n: number }];
    await login("Alpha", code);
    await login("Hotel", "INCONNU1");
    const [{ n: after }] = (await sql`SELECT count(*)::int AS n FROM user_referrals WHERE code = ${code}`) as unknown as [{ n: number }];
    expect(after).toBe(n);
    expect((await app.inject({ method: "POST", url: "/api/v1/referrals/click", payload: { code: "ZZZZZZZ", visitorKey: "visiteur-0000" } })).statusCode).toBe(404);
  });
});

describe("empires", () => {
  it("création validée : nom, tag, couleur, blason, mots réservés, unicité", async () => {
    expect((await createEmpire("Alpha", { name: "VÆLORIA Officiel", tag: "VAE", color: "#d21f2f", crest: "chevron" })).statusCode).toBe(409);
    expect((await createEmpire("Alpha", { name: "Nightmare", tag: "NGT", color: "#123456", crest: "chevron" })).statusCode).toBe(400);
    const ok = await createEmpire("Alpha", { name: "Nightmare", tag: "ngt", motto: "La nuit", color: "#d21f2f", crest: "flamme" });
    expect(ok.statusCode, ok.body).toBe(201);
    expect(ok.json().slug).toBe("nightmare");
    expect((await createEmpire("Bravo", { name: "nightmare", tag: "ABC", color: "#d21f2f", crest: "flamme" })).json().error.code).toBe("name_taken");
    expect((await createEmpire("Bravo", { name: "Titans", tag: "NGT", color: "#d21f2f", crest: "flamme" })).json().error.code).toBe("tag_taken");
    expect((await createEmpire("Alpha", { name: "Second", tag: "SEC", color: "#d21f2f", crest: "flamme" })).json().error.code).toBe("already_member");
    const e = (await app.inject({ url: "/api/v1/empires/nightmare" })).json();
    expect(e).toMatchObject({ name: "Nightmare", tag: "NGT", members: 1, rank: 1 });
    expect(e.roster[0]).toMatchObject({ role: "leader", name: "Fondateur #1" }); // jamais le pseudo Discord
  });

  it("recrutement ouvert, fermé (code requis) et complet", async () => {
    expect((await app.inject({ method: "POST", url: "/api/v1/me/empire/join", headers: as(tokens.Bravo!), payload: { slug: "nightmare" } })).statusCode).toBe(200);
    await app.inject({ method: "PATCH", url: "/api/v1/me/empire", headers: as(tokens.Alpha!), payload: { recruiting: false } });
    expect((await app.inject({ method: "POST", url: "/api/v1/me/empire/join", headers: as(tokens.Charlie!), payload: { slug: "nightmare" } })).json().error.code).toBe("closed");
    const code = (await me("Alpha")).empire.inviteCode;
    expect((await me("Bravo")).empire.inviteCode).toBeNull(); // simple membre : pas de code
    expect((await app.inject({ method: "POST", url: "/api/v1/me/empire/join", headers: as(tokens.Charlie!), payload: { slug: "nightmare", code } })).statusCode).toBe(200);
    await sql`UPDATE site_settings SET value = '3' WHERE key = 'empires.max_members'`;
    expect((await app.inject({ method: "POST", url: "/api/v1/me/empire/join", headers: as(tokens.Delta!), payload: { slug: "nightmare", code } })).json().error.code).toBe("full");
    await sql`UPDATE site_settings SET value = '50' WHERE key = 'empires.max_members'`;
    expect((await app.inject({ method: "PATCH", url: "/api/v1/me/empire", headers: as(tokens.Bravo!), payload: { recruiting: true } })).statusCode).toBe(403);
  });

  it("le chef qui part transmet la couronne ; le dernier membre dissout l'empire", async () => {
    await createEmpire("Delta", { name: "Titans", tag: "TTN", color: "#4f8fdc", crest: "tour" });
    expect((await app.inject({ method: "POST", url: "/api/v1/me/empire/leave", headers: as(tokens.Delta!) })).json().result).toBe("disbanded");
    expect((await app.inject({ url: "/api/v1/empires/titans" })).statusCode).toBe(404);
    // Le nom est de nouveau disponible
    // Le nom est de nouveau disponible ; l'ancienne adresse reste réservée à l'historique de l'empire dissous
    const again = await createEmpire("Delta", { name: "Titans", tag: "TTN", color: "#4f8fdc", crest: "tour" });
    expect(again.statusCode).toBe(201);
    expect(again.json().slug).toBe("titans-ttn");
  });

  it("l'influence gagnée par un membre compte pour son empire", async () => {
    const before = (await app.inject({ url: "/api/v1/empires/nightmare" })).json().influence;
    const poll = (await app.inject({ url: "/api/v1/council/polls" })).json().items[0];
    await app.inject({ method: "POST", url: "/api/v1/me/votes", headers: as(tokens.Bravo!), payload: { slug: poll.slug, optionId: poll.options[0].id } });
    expect((await app.inject({ url: "/api/v1/empires/nightmare" })).json().influence - before).toBe(3);
  });
});

describe("Conseil", () => {
  it("un vote par compte, résultats en pourcentage", async () => {
    const poll = (await app.inject({ url: "/api/v1/council/polls" })).json().items[0];
    expect(poll.question).toBe("Quel événement voulez-vous vendredi ?");
    const vote = (name: string, i: number) => app.inject({ method: "POST", url: "/api/v1/me/votes", headers: as(tokens[name]!), payload: { slug: poll.slug, optionId: poll.options[i].id } });
    expect((await vote("Alpha", 0)).statusCode).toBe(200);
    expect((await vote("Alpha", 1)).json().error.code).toBe("already_voted");
    await vote("Charlie", 1);
    const after = (await app.inject({ url: "/api/v1/council/polls" })).json().items[0];
    expect(after.totalVotes).toBe(3);
    expect(after.options.map((o: { percent: number }) => o.percent)).toEqual([67, 33, 0]);
    expect((await me("Alpha")).votes[poll.slug]).toBe(poll.options[0].id);
    expect((await app.inject({ method: "POST", url: "/api/v1/me/votes", payload: { slug: poll.slug, optionId: poll.options[0].id } })).statusCode).toBe(401);
  });

  it("refuse un vote clos et applique l'éligibilité « compte lié »", async () => {
    await app.inject({ method: "POST", url: "/admin/v1/world/polls", headers: admin, payload: { slug: "lies", question: "Réservé aux comptes liés ?", status: "open", eligibility: "linked", options: ["Oui", "Non"] } });
    const p = (await app.inject({ url: "/api/v1/council/polls" })).json().items.find((x: { slug: string }) => x.slug === "lies");
    expect((await app.inject({ method: "POST", url: "/api/v1/me/votes", headers: as(tokens.Alpha!), payload: { slug: "lies", optionId: p.options[0].id } })).json().error.code).toBe("not_linked");
    expect((await app.inject({ method: "POST", url: "/api/v1/me/votes", headers: as(tokens.Bravo!), payload: { slug: "lies", optionId: p.options[0].id } })).statusCode).toBe(200);
    await sql`UPDATE polls SET closes_at = now() - interval '1 minute' WHERE slug = 'lies'`;
    expect((await app.inject({ method: "POST", url: "/api/v1/me/votes", headers: as(tokens.Echo!), payload: { slug: "lies", optionId: p.options[0].id } })).json().error.code).toBe("closed");
  });

  it("plafond quotidien d'influence par type d'action", async () => {
    await sql`UPDATE influence_rules SET daily_cap = 1 WHERE kind = 'vote_cast'`;
    await app.inject({ method: "POST", url: "/admin/v1/world/polls", headers: admin, payload: { slug: "cap", question: "Plafond d'influence ?", status: "open", options: ["A", "B"] } });
    const p = (await app.inject({ url: "/api/v1/council/polls" })).json().items.find((x: { slug: string }) => x.slug === "cap");
    const before = (await me("Bravo")).influence;
    await app.inject({ method: "POST", url: "/api/v1/me/votes", headers: as(tokens.Bravo!), payload: { slug: "cap", optionId: p.options[0].id } });
    expect((await me("Bravo")).influence).toBe(before); // déjà 1 vote récompensé aujourd'hui
    await sql`UPDATE influence_rules SET daily_cap = 5 WHERE kind = 'vote_cast'`;
  });
});

describe("guerres, événements et carte via VæloriaBridge", () => {
  it("WAR_START / WAR_END sur des factions liées à des empires", async () => {
    await app.inject({ method: "PUT", url: "/admin/v1/world/empires/nightmare", headers: admin, payload: { name: "Nightmare", status: "active", factionName: "Nightmare" } });
    await app.inject({ method: "PUT", url: "/admin/v1/world/empires/titans-ttn", headers: admin, payload: { name: "Titans", status: "active", factionName: "TitansMC" } });
    const started = await bridge({ events: [ev({ event: "WAR_START", warId: "W1", attacker: "nightmare", defender: "TitansMC" })] });
    expect(started.json(), started.body).toMatchObject({ accepted: 1, failed: [] });
    let wars = (await app.inject({ url: "/api/v1/wars?status=active" })).json().items;
    expect(wars[0]).toMatchObject({ status: "active", attacker: { slug: "nightmare" }, defender: { slug: "titans-ttn" } });
    const before = (await me("Bravo")).influence; // Bravo est lié et membre de Nightmare
    await bridge({ events: [ev({ event: "WAR_END", warId: "W1", winner: "Nightmare", attackerScore: 1240, defenderScore: 1105, attackerTerritories: 327, defenderTerritories: 291, participants: 87 })] });
    const war = (await app.inject({ url: `/api/v1/wars/${wars[0].slug}` })).json();
    expect(war).toMatchObject({ status: "ended", winner: "nightmare", participants: 87, attacker: { score: 1240, territories: 327 } });
    expect(war.events.map((e: { kind: string }) => e.kind)).toEqual(["end", "start"]);
    expect((await me("Bravo")).influence - before).toBe(40);
    wars = (await app.inject({ url: "/api/v1/rankings/guerres" })).json().entries;
    expect(wars[0]).toMatchObject({ name: "Nightmare", value: 1 });
  });

  it("EVENT_START / EVENT_END : en direct, participants réels, influence aux comptes liés", async () => {
    await bridge({ events: [ev({ event: "EVENT_START", eventId: "E1", title: "Le siège de Kharos", type: "siege", zone: "kharos" })] });
    const live = (await app.inject({ url: "/api/v1/events" })).json().items[0];
    expect(live).toMatchObject({ title: "Le siège de Kharos", live: true, zoneKey: "kharos", participants: null });
    const before = (await me("Bravo")).influence;
    await bridge({ events: [ev({ event: "EVENT_END", eventId: "E1", participants: [{ uuid: "22222222-2222-4222-8222-000000000002", username: "BravoMC" }, { uuid: "99999999-9999-4999-8999-000000000009", username: "Inconnu" }] })] });
    const past = (await app.inject({ url: "/api/v1/events-past" })).json().items[0];
    expect(past).toMatchObject({ participants: 2, empiresCount: 1, live: false });
    expect((await me("Bravo")).influence - before).toBe(15);
  });

  it("carte : zones configurées et territoires des empires liés", async () => {
    const [season] = await sql`SELECT id FROM seasons WHERE status = 'active'`;
    const [f] = await sql`INSERT INTO factions (season_id, name) VALUES (${season!.id}, 'Nightmare') RETURNING id`;
    for (let x = 0; x < 3; x++) await sql`INSERT INTO claims (faction_id, season_id, world, chunk_x, chunk_z) VALUES (${f!.id}, ${season!.id}, 'world', ${x}, 0)`;
    // Un second monde (ex. le Nether) : ses claims ont leur propre onglet sur la carte.
    await sql`INSERT INTO claims (faction_id, season_id, world, chunk_x, chunk_z) VALUES (${f!.id}, ${season!.id}, 'world_nether', 20, 20)`;
    const map = (await app.inject({ url: "/api/v1/world/map" })).json();
    expect(map.zones.map((z: { key: string }) => z.key)).toContain("citadelle");
    expect(map.zones.every((z: { world: string }) => z.world === "world")).toBe(true);
    expect(map.territories).toEqual([
      expect.objectContaining({ slug: "nightmare", world: "world", cx: 0, cz: 0, chunks: 3 }),
      expect.objectContaining({ slug: "nightmare", world: "world_nether", cx: 2, cz: 2, chunks: 1 }),
    ]);
    expect(map.worlds).toEqual([{ key: "world", name: "Monde principal", chunks: 3 }, { key: "world_nether", name: "world_nether", chunks: 1 }]);
  });

  it("admin : liste des mondes de la carte (« clé = nom »), nom de monde invalide refusé", async () => {
    const base = (await app.inject({ url: "/admin/v1/world/settings", headers: admin })).json();
    expect(base.mapWorlds).toBe("world = Monde principal");
    const { foundersCount: _c, ...settings } = base;
    const ok = await app.inject({ method: "PUT", url: "/admin/v1/world/settings", headers: admin, payload: { ...settings, mapWorlds: "world = Royaume\nworld_nether = Nether\n\nworld = doublon" } });
    expect(ok.statusCode, ok.body).toBe(200);
    expect((await app.inject({ url: "/admin/v1/world/settings", headers: admin })).json().mapWorlds).toBe("world = Royaume\nworld_nether = Nether");
    const bad = await app.inject({ method: "PUT", url: "/admin/v1/world/settings", headers: admin, payload: { ...settings, mapWorlds: "monde avec espaces" } });
    expect(bad.statusCode).toBe(400);
  });
});

describe("accueil, classements, administration", () => {
  it("l'accueil n'agrège que des données réelles", async () => {
    const h = (await app.inject({ url: "/api/v1/world/home" })).json();
    expect(h.founders.count).toBeGreaterThan(0);
    expect(h.empires.length).toBe(h.empireCount);
    expect(h.poll).not.toBeNull();
  });

  it("chaque catégorie de classement répond", async () => {
    for (const c of ["empires", "guerriers", "richesse", "territoires", "guerres", "saison", "recruteurs"]) {
      expect((await app.inject({ url: `/api/v1/rankings/${c}` })).statusCode, c).toBe(200);
    }
    expect((await app.inject({ url: "/api/v1/rankings/recruteurs" })).json().entries[0]).toMatchObject({ value: 1 });
    expect((await app.inject({ url: "/api/v1/rankings/inconnu" })).statusCode).toBe(400);
  });

  it("l'admin monde est protégé et journalisé", async () => {
    expect((await app.inject({ url: "/admin/v1/world/settings" })).statusCode).toBe(401);
    const s = (await app.inject({ url: "/admin/v1/world/settings", headers: admin })).json();
    expect(s.foundersCount).toBeGreaterThan(0);
    const r = await app.inject({ method: "POST", url: "/admin/v1/world/journal", headers: admin, payload: { slug: "episode-05", episode: 5, title: "Test épisode", kind: "short", published: true, publishedAt: new Date().toISOString(), videoUrl: "https://www.youtube.com/watch?v=abc" } });
    expect(r.statusCode).toBe(201);
    expect((await app.inject({ url: "/api/v1/journal" })).json().items[0].title).toBe("Test épisode");
    const logs = await sql`SELECT 1 FROM audit_logs WHERE action = 'world.journal.create'`;
    expect(logs.length).toBe(1);
  });

  it("le recalcul d'influence retrouve les mêmes totaux que le grand livre", async () => {
    const before = await sql`SELECT id, influence FROM users ORDER BY id`;
    await app.inject({ method: "POST", url: "/admin/v1/world/influence/rebuild", headers: admin });
    const after = await sql`SELECT id, influence FROM users ORDER BY id`;
    expect(after).toEqual(before);
  });
});
