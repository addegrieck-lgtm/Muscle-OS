"use server";

import { revalidatePath } from "next/cache";
import { currentAdmin } from "@/components/Shell";
import { adminApi } from "./api";

export type TeamState = { error: string } | { ok: string } | null;

/** Seul le propriétaire attribue ou retire les accès au back-office. */
export async function setTeamRole(_prev: TeamState, form: FormData): Promise<TeamState> {
  const me = await currentAdmin();
  if (me.role !== "owner") return { error: "Seul le propriétaire peut gérer l'équipe." };
  try {
    const r = await adminApi<{ displayName: string; role: string }>("/team", { method: "PUT", body: { email: String(form.get("email") ?? ""), role: String(form.get("role") ?? ""), actor: me.name } });
    revalidatePath("/team");
    return { ok: `${r.displayName} : rôle mis à jour.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
