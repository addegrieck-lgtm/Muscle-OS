import type { Product, ProductVariant } from "@/types/catalog";

/** Objet du message de demande : « Céleste — 26 sphères (Pavillon rond) · Blanc chaud · ×2 ». */
export function requestSubject(
  product: Pick<Product, "name" | "options">,
  variant: Pick<ProductVariant, "name" | "finish"> | null,
  options: Record<string, string>,
  qty: number,
): string {
  const version = variant
    ? variant.finish && variant.finish !== variant.name
      ? `${variant.name} (${variant.finish})`
      : variant.name
    : null;
  const opts = (product.options ?? [])
    .map((o) => o.values.find((v) => v.id === options[o.id])?.label)
    .filter(Boolean);
  const parts = [version, ...opts, qty > 1 ? `×${qty}` : null].filter(Boolean).join(" · ");
  return `Demande : ${product.name}${parts ? ` — ${parts}` : ""}`.slice(0, 160);
}
