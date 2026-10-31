import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("site_settings")
    .select("setting_value")
    .eq("setting_key", key)
    .maybeSingle();
  return data?.setting_value && typeof data.setting_value === "object"
    ? { ...fallback, ...(data.setting_value as object) }
    : fallback;
}

export async function writeSetting(key: string, value: unknown, isPublic: boolean) {
  const supabase = await createSupabaseServerClient();
  return supabase
    .from("site_settings")
    .upsert(
      { setting_key: key, setting_value: value, is_public: isPublic },
      { onConflict: "setting_key" },
    );
}
