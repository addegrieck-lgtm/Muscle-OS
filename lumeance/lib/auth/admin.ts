import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "super_admin" | "admin" | "order_manager";

export interface AdminSession {
  userId: string;
  email: string | null;
  role: AdminRole;
  adminId: string;
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super administrateur",
  admin: "Administrateur",
  order_manager: "Gestionnaire de commandes",
};

/** Lit la session et vérifie, CÔTÉ SERVEUR, que l'utilisateur est un administrateur actif. */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  // getUser() valide le jeton auprès de Supabase Auth (getSession() ne le ferait pas).
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, role, active")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (!admin || !admin.active) return null;
  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    role: admin.role,
    adminId: admin.id,
  };
});

/** À appeler en tête de chaque page et action d'administration. */
export async function requireAdmin(roles?: AdminRole[]): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (roles && !roles.includes(session.role)) redirect("/admin/dashboard?refus=1");
  return session;
}

export const CATALOG_ROLES: AdminRole[] = ["super_admin", "admin"];
