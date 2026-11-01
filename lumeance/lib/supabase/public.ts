import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/** Client anonyme sans cookies, pour les lectures publiques mises en cache (catalogue). */
export function createSupabasePublicClient() {
  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** URL publique d'une image : chemin du site (« /products/… ») tel quel, sinon fichier du bucket. */
export function storagePublicUrl(path: string): string {
  if (path.startsWith("/")) return path;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
