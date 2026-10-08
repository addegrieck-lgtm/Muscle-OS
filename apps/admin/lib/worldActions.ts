"use server";

import { revalidatePath } from "next/cache";
import { adminApi } from "./api";
import { fieldsToBody, type Field } from "./resources";

export type WorldFormState = { error: string } | { ok: true } | null;

/** Enregistre un élément du monde (réglages, paliers, journal, guerres…) via l'API admin. */
export async function saveWorld(path: string, method: "POST" | "PUT", fields: Field[], back: string, _prev: WorldFormState, form: FormData): Promise<WorldFormState> {
  try {
    await adminApi(`/world/${path}`, { method, body: fieldsToBody(fields, form) });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(back);
  return { ok: true };
}

export async function deleteWorld(path: string, back: string) {
  await adminApi(`/world/${path}`, { method: "DELETE" });
  revalidatePath(back);
}

export async function rebuildInfluence() {
  await adminApi("/world/influence/rebuild", { method: "POST" });
  revalidatePath("/world/influence");
}
