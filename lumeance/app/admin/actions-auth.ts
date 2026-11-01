"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { clientIp } from "@/lib/services/rate-limit";
import { allowRequest } from "@/lib/services/request-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

export async function signIn(_: { error: string }, form: FormData): Promise<{ error: string }> {
  if (!isSupabaseConfigured()) return { error: "Supabase n’est pas configuré." };
  const ip = clientIp(await headers());
  if (!(await allowRequest(`login:${ip}`, 8, 15 * 60_000, "LOGIN_LIMITER")))
    return { error: "Trop de tentatives. Réessayez dans 15 minutes." };
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Identifiants invalides." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Identifiants invalides." };
  const { data: admin } = await supabase
    .from("admin_users")
    .select("active")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  if (!admin?.active) {
    await supabase.auth.signOut();
    return { error: "Ce compte n’a pas accès à l’administration." };
  }
  redirect("/admin/dashboard");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
