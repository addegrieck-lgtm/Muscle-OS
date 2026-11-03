"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { back, dbError } from "@/lib/admin/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  customerId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "pending"]),
});

/** Validation (ou refus) d'un compte entreprise : active les prix HT et la remise par paliers. */
export async function setProStatus(form: FormData) {
  await requireAdmin(["super_admin", "admin"]);
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) back("/admin/customers", { erreur: "Demande invalide." });
  const { customerId, status } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("customer_accounts")
    .update({ pro_status: status, pro_reviewed_at: new Date().toISOString() })
    .eq("customer_id", customerId)
    .eq("account_type", "entreprise");
  const path = `/admin/customers/${customerId}`;
  if (error) back(path, { erreur: dbError("setProStatus", error) });
  revalidatePath(path);
  back(path, {
    ok:
      status === "approved"
        ? "Compte entreprise validé : prix HT et remise par paliers actifs."
        : status === "rejected"
          ? "Compte entreprise refusé."
          : "Compte remis en attente.",
  });
}
