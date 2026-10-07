import type { FastifyRequest } from "fastify";
import type { Sql } from "../db";
import { resolveSession } from "../services/identity";
import { unauthorized } from "./errors";

/** Le site transmet la session du joueur côté serveur : `Authorization: Session <jeton>`. */
export function sessionToken(req: FastifyRequest): string | null {
  const h = req.headers.authorization ?? "";
  return h.startsWith("Session ") ? h.slice(8).trim() : null;
}

export async function requireUser(sql: Sql, req: FastifyRequest): Promise<{ id: string; role: string }> {
  const token = sessionToken(req);
  const user = token ? await resolveSession(sql, token) : null;
  if (!user) throw unauthorized("Connexion requise");
  req.user = user;
  return user;
}
