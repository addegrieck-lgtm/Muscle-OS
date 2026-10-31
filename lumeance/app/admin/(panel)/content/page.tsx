import { revalidatePath } from "next/cache";
import { Card, Field, Flash, PageTitle, flashFrom, inputClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { firstError } from "@/lib/admin/forms";
import { back, dbError } from "@/lib/admin/redirect";
import { readSetting, writeSetting } from "@/lib/admin/settings";
import { DEFAULT_HOME } from "@/lib/services/content";
import { homeContentSchema } from "@/lib/validation/schemas";

export const metadata = { title: "Contenus" };

const FIELDS: { key: keyof typeof DEFAULT_HOME; label: string; long?: boolean }[] = [
  { key: "heroTitle", label: "Hero — titre" },
  { key: "heroSignature", label: "Hero — signature" },
  { key: "heroText", label: "Hero — texte", long: true },
  { key: "manifestoTitle", label: "Manifeste — titre" },
  { key: "manifestoText", label: "Manifeste — texte", long: true },
  { key: "immersiveQuote", label: "Section immersive — citation" },
  { key: "newsletterTitle", label: "Lettre — titre" },
];

async function saveHome(form: FormData) {
  "use server";
  await requireAdmin(CATALOG_ROLES);
  const parsed = homeContentSchema.safeParse(
    Object.fromEntries(FIELDS.map((f) => [f.key, form.get(f.key) ?? ""])),
  );
  if (!parsed.success) back("/admin/content", { erreur: firstError(parsed.error.issues) });
  const { error } = await writeSetting("content.home", parsed.data, true);
  if (error) back("/admin/content", { erreur: dbError("saveHome", error) });
  revalidatePath("/", "layout");
  back("/admin/content", { ok: "Page d’accueil mise à jour." });
}

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin(CATALOG_ROLES);
  const home = await readSetting("content.home", DEFAULT_HOME);
  return (
    <>
      <PageTitle
        title="Contenus"
        subtitle="Textes éditoriaux du site, modifiables sans toucher au code"
      />
      <Flash {...flashFrom(await searchParams)} />
      <Card title="Page d’accueil">
        <form action={saveHome} className="grid gap-4">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label}>
              {f.long ? (
                <textarea
                  name={f.key}
                  rows={f.key === "manifestoText" ? 6 : 3}
                  defaultValue={home[f.key]}
                  className={inputClass}
                />
              ) : (
                <input name={f.key} defaultValue={home[f.key]} className={inputClass} />
              )}
            </Field>
          ))}
          <div>
            <SubmitButton>Publier</SubmitButton>
          </div>
        </form>
      </Card>
      <p className="mt-6 text-sm text-brun/55">
        Les descriptions des collections se modifient dans « Catégories » ; les informations
        commerciales (livraison, coordonnées) dans « Paramètres ».
      </p>
    </>
  );
}
