import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../src/db";
import { ADMIN_TOKEN, freshDb, INTERNAL_TOKEN, testApp } from "./helpers";

const SETUP = "code-de-test-proprietaire-0123";
let sql: Sql;
let app: FastifyInstance;

const internal = (path: string, payload: object) => app.inject({ method: "POST", url: `/internal/v1/auth/${path}`, headers: { "x-internal-token": INTERNAL_TOKEN }, payload });
const register = (email: string, password = "un-bon-mot-de-passe", displayName = "Ad", extra: object = {}) =>
  internal("register", { email, password, displayName: displayName.length < 3 ? `${displayName}rien` : displayName, clientIp: `ip-${email}`, ...extra });
const me = (token: string) => app.inject({ method: "GET", url: "/api/v1/me", headers: { authorization: `Session ${token}` } });
const admin = { authorization: `Bearer ${ADMIN_TOKEN}` };

beforeAll(async () => {
  sql = await freshDb();
  app = await testApp(sql, {}, { ADMIN_SETUP_CODE: SETUP });
});
afterAll(async () => {
  await app.close();
  await sql.end();
});

describe("comptes e-mail + mot de passe", () => {
  it("inscription → session, fondateur, e-mail unique (casse ignorée)", async () => {
    const r = await register("Owner@Example.fr");
    expect(r.statusCode).toBe(200);
    const m = (await me(r.json().token)).json();
    expect(m.user.role).toBe("player");
    const [u] = await sql`SELECT email, password_hash FROM users WHERE email = 'owner@example.fr'`;
    expect(u!.password_hash).toMatch(/^scrypt\$/); // jamais en clair
    expect((await sql`SELECT count(*)::int AS n FROM founders`)[0]!.n).toBe(1);
    expect((await register("owner@example.FR")).statusCode).toBe(409);
  });

  it("mot de passe faible ou pseudo invalide refusés", async () => {
    expect((await register("a@b.fr", "court")).statusCode).toBe(400);
    expect((await register("b@b.fr", "aaaaaaaaaaaa")).statusCode).toBe(400);
    expect((await register("c@b.fr", "un-bon-mot-de-passe", "<script>")).statusCode).toBe(400);
  });

  it("connexion : bon mot de passe OK, mauvais refusé avec le même message qu'un e-mail inconnu, verrou après 10 échecs", async () => {
    const ok = await internal("login", { email: "OWNER@example.fr", password: "un-bon-mot-de-passe", clientIp: "1" });
    expect(ok.statusCode).toBe(200);
    const bad = await internal("login", { email: "owner@example.fr", password: "faux-mot-de-passe", clientIp: "2" });
    const unknown = await internal("login", { email: "inconnu@example.fr", password: "faux-mot-de-passe", clientIp: "3" });
    expect(bad.statusCode).toBe(401);
    expect(unknown.json().error.message).toBe(bad.json().error.message);
    for (let i = 0; i < 9; i++) await internal("login", { email: "owner@example.fr", password: "x", clientIp: `l${i}` });
    const locked = await internal("login", { email: "owner@example.fr", password: "un-bon-mot-de-passe", clientIp: "4" });
    expect(locked.statusCode).toBe(429);
    await sql`DELETE FROM login_failures`;
  });

  it("routes internes inaccessibles sans le jeton du site", async () => {
    const r = await app.inject({ method: "POST", url: "/internal/v1/auth/login", payload: { email: "owner@example.fr", password: "un-bon-mot-de-passe" } });
    expect(r.statusCode).toBe(401);
  });
});

describe("accès au back-office", () => {
  it("le code d'administration fait du compte un propriétaire ; mauvais code refusé et journalisé", async () => {
    const token = (await internal("login", { email: "owner@example.fr", password: "un-bon-mot-de-passe", clientIp: "5" })).json().token;
    const h = { authorization: `Session ${token}` };
    const bad = await app.inject({ method: "POST", url: "/api/v1/me/claim-admin", headers: h, payload: { code: "mauvais" } });
    expect(bad.statusCode).toBe(403);
    const good = await app.inject({ method: "POST", url: "/api/v1/me/claim-admin", headers: h, payload: { code: SETUP } });
    expect(good.statusCode).toBe(200);
    expect((await me(token)).json().user.role).toBe("owner");
    const logs = await sql`SELECT action FROM audit_logs WHERE action LIKE 'admin.claim%' ORDER BY id`;
    expect(logs.map((l) => l.action)).toEqual(["admin.claim_refused", "admin.claimed"]);
  });

  it("équipe : le propriétaire nomme un admin ; le dernier propriétaire ne peut pas être rétrogradé", async () => {
    await register("modo@example.fr", "un-autre-mot-de-passe", "Modo");
    const put = (email: string, role: string) => app.inject({ method: "PUT", url: "/admin/v1/team", headers: admin, payload: { email, role, actor: "owner@example.fr" } });
    expect((await put("modo@example.fr", "admin")).statusCode).toBe(200);
    expect((await put("absent@example.fr", "admin")).statusCode).toBe(404);
    expect((await put("owner@example.fr", "admin")).statusCode).toBe(409);
    const team = (await app.inject({ method: "GET", url: "/admin/v1/team", headers: admin })).json().items;
    expect(team.map((t: { email: string; role: string }) => `${t.email}:${t.role}`).sort()).toEqual(["modo@example.fr:admin", "owner@example.fr:owner"]);
    expect((await app.inject({ method: "GET", url: "/admin/v1/team" })).statusCode).toBe(401);
  });
});
