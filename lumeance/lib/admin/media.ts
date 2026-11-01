import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkUpload, storagePath } from "@/lib/services/media";

/** Contrôle (taille, signature réelle du fichier) puis envoie une image dans le bucket « media »
 * et l'enregistre dans la médiathèque. Retourne le chemin de stockage. */
export async function uploadImage(
  supabase: SupabaseClient,
  file: File,
  folder: string,
  alt: string,
): Promise<{ path?: string; error?: string }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(file.size, buf.slice(0, 16));
  if (!check.ok) return { error: check.error };
  const path = storagePath(folder, check.extension!, randomUUID());
  const { error } = await supabase.storage.from("media").upload(path, buf, {
    contentType: check.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    console.error("[media] upload:", error.message);
    return { error: "Échec de l’envoi du fichier." };
  }
  const { error: dbErr } = await supabase.from("media_assets").insert({
    storage_path: path,
    alt_text: alt.slice(0, 250),
    folder,
    mime_type: check.type,
    size_bytes: file.size,
  });
  if (dbErr) {
    await supabase.storage.from("media").remove([path]);
    console.error("[media] insert:", dbErr.message);
    return { error: "Échec de l’enregistrement du média." };
  }
  return { path };
}
