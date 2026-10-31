import Image from "next/image";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Card, Field, Flash, PageTitle, flashFrom, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { uploadImage } from "@/lib/admin/media";
import { back, dbError } from "@/lib/admin/redirect";
import { storagePublicUrl } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mediaMetaSchema } from "@/lib/validation/schemas";

export const metadata = { title: "Médias" };

async function upload(form: FormData) {
  "use server";
  await requireAdmin(CATALOG_ROLES);
  const meta = mediaMetaSchema.safeParse({
    alt_text: form.get("alt_text") ?? "",
    folder: form.get("folder") || "general",
  });
  if (!meta.success) back("/admin/media", { erreur: "Dossier ou texte alternatif invalide." });
  const files = form
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 10);
  if (!files.length) back("/admin/media", { erreur: "Aucun fichier sélectionné." });
  const supabase = await createSupabaseServerClient();
  const errors: string[] = [];
  for (const f of files) {
    const r = await uploadImage(supabase, f, meta.data.folder, meta.data.alt_text);
    if (r.error) errors.push(`${f.name.slice(0, 60)} : ${r.error}`);
  }
  revalidatePath("/admin/media");
  if (errors.length) back("/admin/media", { erreur: errors.join(" — ") });
  back("/admin/media", { ok: `${files.length} fichier(s) importé(s).` });
}

async function updateMedia(form: FormData) {
  "use server";
  await requireAdmin(CATALOG_ROLES);
  const mid = z.string().uuid().parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  if (form.get("op") === "delete") {
    const { data: m } = await supabase
      .from("media_assets")
      .select("storage_path")
      .eq("id", mid)
      .single();
    if (!m) back("/admin/media", { erreur: "Média introuvable." });
    const { count } = await supabase
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", m.storage_path);
    if (count)
      back("/admin/media", {
        erreur: "Ce média est utilisé par un produit : retirez-le d’abord de la fiche.",
      });
    await supabase.storage.from("media").remove([m.storage_path]);
    const { error } = await supabase.from("media_assets").delete().eq("id", mid);
    if (error) back("/admin/media", { erreur: dbError("deleteMedia", error) });
    back("/admin/media", { ok: "Média supprimé." });
  }
  const meta = mediaMetaSchema.safeParse({
    alt_text: form.get("alt_text") ?? "",
    folder: form.get("folder") || "general",
  });
  if (!meta.success) back("/admin/media", { erreur: "Valeurs invalides." });
  const { error } = await supabase.from("media_assets").update(meta.data).eq("id", mid);
  if (error) back("/admin/media", { erreur: dbError("updateMedia", error) });
  back("/admin/media", { ok: "Média mis à jour." });
}

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin(CATALOG_ROLES);
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(120);
  if (sp.dossier && /^[a-z0-9-]{1,40}$/.test(sp.dossier)) q = q.eq("folder", sp.dossier);
  const { data } = await q;
  return (
    <>
      <PageTitle title="Médias" subtitle="Bibliothèque d’images réutilisables" />
      <Flash {...flashFrom(sp)} />
      <Card title="Importer" className="mb-6">
        <form action={upload} className="grid gap-3 md:grid-cols-4">
          <Field
            label="Fichiers (10 max)"
            hint="JPEG, PNG, WebP, AVIF — 10 Mo par fichier"
            className="md:col-span-2"
          >
            <input
              type="file"
              name="files"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="text-sm"
            />
          </Field>
          <Field label="Dossier" hint="ex. produits, ambiances, journal">
            <input
              name="folder"
              defaultValue="general"
              pattern="[a-z0-9-]{1,40}"
              className={inputClass}
            />
          </Field>
          <Field label="Texte alternatif">
            <input name="alt_text" maxLength={250} className={inputClass} />
          </Field>
          <div className="md:col-span-4">
            <SubmitButton>Importer</SubmitButton>
          </div>
        </form>
      </Card>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {(data ?? []).map((m) => (
          <li key={m.id} className="border border-brun/10 bg-white p-2">
            <div className="relative aspect-square bg-creme">
              <Image
                src={storagePublicUrl(m.storage_path)}
                alt={m.alt_text}
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
            <form action={updateMedia} className="mt-2 space-y-1">
              <input type="hidden" name="id" value={m.id} />
              <input
                name="alt_text"
                defaultValue={m.alt_text}
                maxLength={250}
                placeholder="Texte alternatif"
                className={`${inputClass} text-xs`}
                aria-label="Texte alternatif"
              />
              <input
                name="folder"
                defaultValue={m.folder}
                className={`${inputClass} text-xs`}
                aria-label="Dossier"
              />
              <p className="truncate text-[0.65rem] text-brun/45" title={m.storage_path}>
                {m.storage_path} · {Math.round(m.size_bytes / 1024)} Ko
              </p>
              <div className="flex gap-1">
                <button
                  name="op"
                  value="save"
                  className="border border-brun/20 px-2 py-1 text-[0.65rem] uppercase"
                >
                  Enregistrer
                </button>
                <button
                  name="op"
                  value="delete"
                  className="border border-[#8a3b2a]/30 px-2 py-1 text-[0.65rem] uppercase text-[#8a3b2a]"
                >
                  Supprimer
                </button>
              </div>
            </form>
          </li>
        ))}
      </ul>
      {!data?.length && <p className="text-sm text-brun/50">Aucun média.</p>}
    </>
  );
}
