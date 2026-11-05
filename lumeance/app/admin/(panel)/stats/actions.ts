"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { NO_STATS_COOKIE } from "@/lib/services/traffic";

/** Exclut (ou réintègre) CET appareil de la mesure d'audience, même hors connexion. */
export async function setDeviceExcluded(form: FormData) {
  await requireAdmin();
  const store = await cookies();
  if (form.get("exclude") === "1")
    store.set(NO_STATS_COOKIE, "1", {
      maxAge: 400 * 24 * 3600,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  else store.delete(NO_STATS_COOKIE);
  redirect("/admin/stats");
}
