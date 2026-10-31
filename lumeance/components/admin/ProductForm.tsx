import { Card, Field, inputClass } from "./ui";
import { SubmitButton } from "./SubmitButton";
import { centsToInput } from "@/lib/money";
import { specsToText } from "@/lib/admin/forms";

export interface ProductRecord {
  id?: string;
  name?: string;
  slug?: string;
  reference?: string;
  short_description?: string | null;
  description?: string | null;
  price?: number;
  compare_at_price?: number | null;
  category_id?: string | null;
  status?: string;
  featured?: boolean;
  dimensions?: Record<string, number>;
  weight?: number | null;
  materials?: string[];
  finishes?: string[];
  technical_specifications?: { label: string; value: string }[];
  delivery_information?: string | null;
  assembly_information?: string | null;
  stock_quantity?: number;
  seo_title?: string | null;
  seo_description?: string | null;
}

const DIMS: [string, string][] = [
  ["height", "Hauteur (cm)"],
  ["width", "Largeur (cm)"],
  ["depth", "Profondeur (cm)"],
  ["diameter", "Diamètre (cm)"],
  ["cable_length", "Câble (cm)"],
];

export function ProductForm({
  action,
  product = {},
  categories,
}: {
  action: (fd: FormData) => Promise<void>;
  product?: ProductRecord;
  categories: { id: string; name: string }[];
}) {
  return (
    <form action={action} className="grid gap-6 xl:grid-cols-3">
      {product.id && <input type="hidden" name="id" value={product.id} />}
      <div className="space-y-6 xl:col-span-2">
        <Card title="Informations">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nom" className="md:col-span-2">
              <input
                name="name"
                required
                maxLength={160}
                defaultValue={product.name}
                className={inputClass}
              />
            </Field>
            <Field label="Référence" hint="Unique, ex. LUM-SUS-001">
              <input
                name="reference"
                required
                maxLength={60}
                defaultValue={product.reference}
                className={inputClass}
              />
            </Field>
            <Field label="Slug (URL)" hint="Laisser vide pour le générer depuis le nom">
              <input
                name="slug"
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                defaultValue={product.slug}
                className={inputClass}
              />
            </Field>
            <Field label="Accroche" className="md:col-span-2">
              <input
                name="short_description"
                maxLength={300}
                defaultValue={product.short_description ?? ""}
                className={inputClass}
              />
            </Field>
            <Field
              label="Description"
              className="md:col-span-2"
              hint="Paragraphes séparés par une ligne vide."
            >
              <textarea
                name="description"
                rows={7}
                maxLength={8000}
                defaultValue={product.description ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <Card title="Caractéristiques vérifiées">
          <p className="mb-4 text-xs text-brun/55">
            N’indiquer que des informations confirmées par la documentation du fournisseur (aucune
            certification ni origine sans justificatif).
          </p>
          <div className="grid gap-4 md:grid-cols-5">
            {DIMS.map(([k, label]) => (
              <Field key={k} label={label}>
                <input
                  name={`dim_${k}`}
                  inputMode="decimal"
                  defaultValue={product.dimensions?.[k] ? String(product.dimensions[k]! / 10) : ""}
                  className={inputClass}
                />
              </Field>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Poids (kg)">
              <input
                name="weight"
                inputMode="decimal"
                defaultValue={product.weight ? String(product.weight / 1000) : ""}
                className={inputClass}
              />
            </Field>
            <Field label="Matériaux" hint="Séparés par des virgules">
              <input
                name="materials"
                defaultValue={product.materials?.join(", ")}
                className={inputClass}
              />
            </Field>
            <Field label="Finitions" hint="Séparées par des virgules">
              <input
                name="finishes"
                defaultValue={product.finishes?.join(", ")}
                className={inputClass}
              />
            </Field>
          </div>
          <Field
            label="Fiche technique"
            hint="Une ligne par caractéristique : « Libellé : valeur » (ex. Culot : E14)"
            className="mt-4"
          >
            <textarea
              name="technical_specifications"
              rows={6}
              defaultValue={specsToText(product.technical_specifications ?? [])}
              className={inputClass}
            />
          </Field>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Informations de livraison">
              <textarea
                name="delivery_information"
                rows={3}
                defaultValue={product.delivery_information ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Informations de montage">
              <textarea
                name="assembly_information"
                rows={3}
                defaultValue={product.assembly_information ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <Card title="Référencement">
          <div className="grid gap-4">
            <Field label="Titre SEO" hint="70 caractères maximum">
              <input
                name="seo_title"
                maxLength={70}
                defaultValue={product.seo_title ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Meta description" hint="170 caractères maximum">
              <textarea
                name="seo_description"
                rows={2}
                maxLength={170}
                defaultValue={product.seo_description ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Publication">
          <div className="space-y-4">
            <Field label="Statut">
              <select name="status" defaultValue={product.status ?? "draft"} className={inputClass}>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </Field>
            <Field label="Catégorie">
              <select
                name="category_id"
                defaultValue={product.category_id ?? ""}
                className={inputClass}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={product.featured}
                className="accent-champagne"
              />{" "}
              Pièce signature (mise en avant)
            </label>
          </div>
        </Card>
        <Card title="Prix et stock">
          <div className="space-y-4">
            <Field label="Prix TTC (€)">
              <input
                name="price"
                required
                inputMode="decimal"
                defaultValue={product.price !== undefined ? centsToInput(product.price) : ""}
                className={inputClass}
              />
            </Field>
            <Field
              label="Prix barré (€)"
              hint="Promotion : doit être supérieur au prix. Respecter la réglementation des annonces de réduction."
            >
              <input
                name="compare_at_price"
                inputMode="decimal"
                defaultValue={
                  product.compare_at_price ? centsToInput(product.compare_at_price) : ""
                }
                className={inputClass}
              />
            </Field>
            <Field label="Stock">
              <input
                name="stock_quantity"
                type="number"
                min={0}
                max={100000}
                defaultValue={product.stock_quantity ?? 0}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>
        <SubmitButton>{product.id ? "Enregistrer" : "Créer le produit"}</SubmitButton>
      </div>
    </form>
  );
}
