import { PageTitle, Table } from "@/components/admin/ui";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Journal d’activité" };

const ACTIONS: Record<string, string> = {
  insert: "Création",
  update: "Modification",
  delete: "Suppression",
};

export default async function ActivityPage() {
  await requireAdmin(CATALOG_ROLES);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("admin_activity_log")
    .select("*, admin_users(email)")
    .order("created_at", { ascending: false })
    .limit(300);
  return (
    <>
      <PageTitle
        title="Journal d’activité"
        subtitle="Toutes les modifications faites depuis l’administration (enregistrées par la base, non modifiables)"
      />
      <Table
        head={["Date", "Administrateur", "Action", "Élément", "Détail"]}
        empty={data?.length ? undefined : "Aucune activité."}
      >
        {(data ?? []).map((l) => {
          const meta = l.metadata as { label?: string; changed?: string[] };
          return (
            <tr key={l.id}>
              <td className="px-4 py-3 text-brun/60">
                {new Date(l.created_at).toLocaleString("fr-FR")}
              </td>
              <td className="px-4 py-3">
                {(l.admin_users as { email: string | null } | null)?.email ?? "—"}
              </td>
              <td className="px-4 py-3">{ACTIONS[l.action] ?? l.action}</td>
              <td className="px-4 py-3">
                {l.entity_type}
                {meta.label && <span className="block text-xs text-brun/50">{meta.label}</span>}
              </td>
              <td className="px-4 py-3 text-xs text-brun/60">{meta.changed?.join(", ")}</td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
