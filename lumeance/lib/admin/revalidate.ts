import "server-only";
import { revalidatePath } from "next/cache";
import { forget } from "@/lib/services/ttl-memo";

/**
 * Après une modification du contenu public : vide la mémoire courte de cette instance et
 * invalide les pages. Les autres instances se mettent à jour d'elles-mêmes sous 60 s.
 */
export function revalidatePublic(...args: Parameters<typeof revalidatePath>) {
  forget("public:");
  revalidatePath(...args);
}
