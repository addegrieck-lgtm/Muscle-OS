import { csvResponse } from "@/lib/admin/csv-route";
import { CATALOG_ROLES } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Export des données clients : réservé aux administrateurs (pas aux gestionnaires de commandes).
export async function GET() {
  return csvResponse(CATALOG_ROLES, "clients", async () => {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("customers")
      .select("email, first_name, last_name, phone, created_at")
      .order("created_at")
      .limit(10000);
    return {
      header: ["E-mail", "Prénom", "Nom", "Téléphone", "Créé le"],
      rows: (data ?? []).map((c) => [
        c.email,
        c.first_name,
        c.last_name,
        c.phone,
        new Date(c.created_at).toLocaleDateString("fr-FR"),
      ]),
    };
  });
}
