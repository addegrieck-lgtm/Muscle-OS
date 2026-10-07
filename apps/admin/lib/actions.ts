"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminApi } from "./api";
import { RESOURCES, formToBody } from "./resources";

export type FormState = { error: string } | null;

export async function saveResource(key: string, id: string | null, _prev: FormState, form: FormData): Promise<FormState> {
  const r = RESOURCES[key];
  if (!r) return { error: "Ressource inconnue" };
  try {
    await adminApi(`/${r.key}${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: formToBody(r, form) });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath(`/${r.route}`);
  redirect(`/${r.route}`);
}

export async function deleteResource(key: string, id: string) {
  const r = RESOURCES[key]!;
  await adminApi(`/${r.key}/${id}`, { method: "DELETE" });
  revalidatePath(`/${r.route}`);
}

export async function retryCommand(id: string) {
  await adminApi(`/commands/${id}/retry`, { method: "POST" });
  revalidatePath("/commands");
}

export async function enqueueCommand(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await adminApi("/commands", {
      method: "POST",
      body: { playerUuid: String(form.get("playerUuid") || "") || null, command: String(form.get("command") ?? ""), requireOnline: form.get("requireOnline") === "on" },
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/commands");
  return null;
}

export async function setMaintenance(enabled: boolean) {
  await adminApi("/settings/maintenance", { method: "PUT", body: { enabled } });
  revalidatePath("/server");
}

export async function createIncident(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await adminApi("/incidents", { method: "POST", body: { title: form.get("title"), severity: form.get("severity"), status: form.get("status"), body: form.get("body") ?? "" } });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/server");
  return null;
}

export async function resolveIncident(id: string, title: string, severity: string, body: string) {
  await adminApi(`/incidents/${id}`, { method: "PUT", body: { title, severity, body, status: "resolved" } });
  revalidatePath("/server");
}
