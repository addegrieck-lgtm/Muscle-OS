"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { back } from "@/lib/admin/redirect";
import { generateSeoReport } from "@/lib/services/seo-report";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateReportNow() {
  await requireAdmin(CATALOG_ROLES);
  const supabase = await createSupabaseServerClient();
  let id: string;
  try {
    ({ id } = await generateSeoReport(supabase, "manuel"));
  } catch (e) {
    console.error("generateReportNow:", (e as Error).message);
    back("/admin/rapports", {
      erreur:
        "Le rapport n’a pas pu être enregistré (migration 20261113000100_seo_reports.sql exécutée ?).",
    });
  }
  revalidatePath("/admin/rapports");
  redirect(`/admin/rapports?id=${id}&ok=${encodeURIComponent("Rapport généré.")}`);
}
