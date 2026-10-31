import "server-only";
import { redirect } from "next/navigation";

/** Redirige avec un message flash (affiché par <Flash />). */
export function back(path: string, msg: { ok?: string; erreur?: string }): never {
  const url = new URL(path, "http://x");
  if (msg.ok) url.searchParams.set("ok", msg.ok);
  if (msg.erreur) url.searchParams.set("erreur", msg.erreur);
  redirect(`${url.pathname}${url.search}`);
}

/** Message générique pour les erreurs base de données : le détail reste dans les journaux serveur. */
export function dbError(context: string, error: { message: string; code?: string } | null): string {
  if (!error) return "";
  console.error(`[admin] ${context}:`, error.code, error.message);
  if (error.code === "23505") return "Cette valeur existe déjà (référence, slug ou SKU en double).";
  if (error.code === "42501") return "Action non autorisée pour votre rôle.";
  if (error.code === "23514") return "Opération refusée par une règle de cohérence.";
  return "L’opération n’a pas pu être enregistrée.";
}
