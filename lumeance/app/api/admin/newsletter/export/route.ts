import { csvResponse } from "@/lib/admin/csv-route";
import { CATALOG_ROLES } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return csvResponse(CATALOG_ROLES, "lettre", async () => {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("email, status, consent_timestamp, consent_source")
      .eq("status", "subscribed")
      .limit(50000);
    return {
      header: ["E-mail", "Statut", "Consentement", "Origine"],
      rows: (data ?? []).map((n) => [n.email, n.status, n.consent_timestamp, n.consent_source]),
    };
  });
}
