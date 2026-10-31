import { parseEuroInput } from "@/lib/money";
import { productSchema, type ProductInput } from "@/lib/validation/schemas";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

const list = (raw: string) =>
  raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const intOrUndef = (raw: string) => {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : NaN;
};

/** « Libellé : valeur » par ligne -> [{label, value}] */
export function parseSpecs(raw: string) {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i === -1
        ? { label: l, value: "" }
        : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
    });
}

export function specsToText(specs: { label: string; value: string }[]) {
  return specs.map((s) => `${s.label} : ${s.value}`).join("\n");
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Convertit le formulaire d'administration produit en données validées (Zod). */
export function productFromForm(fd: FormData) {
  const price = parseEuroInput(str(fd, "price"));
  const compare = str(fd, "compare_at_price").trim()
    ? parseEuroInput(str(fd, "compare_at_price"))
    : null;
  const weightKg = str(fd, "weight").trim();
  const dims: Record<string, number | undefined> = {};
  for (const k of ["height", "width", "depth", "diameter", "cable_length"]) {
    const cm = intOrUndef(str(fd, `dim_${k}`)); // saisie en cm
    if (cm !== undefined) dims[k] = Number.isNaN(cm) ? NaN : cm * 10;
  }
  const raw = {
    name: str(fd, "name"),
    slug: str(fd, "slug").trim() || slugify(str(fd, "name")),
    reference: str(fd, "reference"),
    short_description: str(fd, "short_description"),
    description: str(fd, "description"),
    price: price ?? NaN,
    compare_at_price: compare === null ? null : (compare ?? NaN),
    category_id: str(fd, "category_id") || null,
    status: str(fd, "status") || "draft",
    featured: fd.get("featured") === "on",
    dimensions: Object.fromEntries(Object.entries(dims).filter(([, v]) => v !== undefined)),
    weight: weightKg ? Math.round(Number(weightKg.replace(",", ".")) * 1000) : null,
    materials: list(str(fd, "materials")),
    finishes: list(str(fd, "finishes")),
    technical_specifications: parseSpecs(str(fd, "technical_specifications")),
    delivery_information: str(fd, "delivery_information"),
    assembly_information: str(fd, "assembly_information"),
    stock_quantity: Number(str(fd, "stock_quantity") || 0),
    seo_title: str(fd, "seo_title"),
    seo_description: str(fd, "seo_description"),
  };
  return productSchema.safeParse(raw);
}

export type { ProductInput };

export function firstError(issues: { path: PropertyKey[]; message: string }[]): string {
  const i = issues[0];
  if (!i) return "Formulaire invalide.";
  const field = i.path.map(String).join(".");
  return field ? `${field} : ${i.message}` : i.message;
}
