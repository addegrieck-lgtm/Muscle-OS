import type { Product, ShippingSettings } from "@/types/catalog";
import type { CartLineInput } from "@/lib/validation/schemas";

export interface PricedLine {
  productId: string;
  variantId: string | null;
  options: Record<string, string> | null;
  slug: string;
  name: string;
  reference: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
  art: Product["art"];
  imageUrl: string | null;
  isDemo: boolean;
}

export interface CartQuote {
  lines: PricedLine[];
  /** Lignes retirées (produit dépublié, variante inactive…) avec la raison. */
  removed: { productId: string; reason: string }[];
  subtotal: number;
  shipping: number | null; // null = à confirmer
  total: number;
  itemCount: number;
}

/**
 * Recalcule le panier À PARTIR DU CATALOGUE SERVEUR : les prix envoyés par le navigateur ne sont
 * jamais utilisés. Fonction pure, testée.
 */
/** Identifiant d'une ligne de panier : produit + version + options (triées). */
export function lineKey(l: Pick<CartLineInput, "productId" | "variantId" | "options">): string {
  const opts = Object.entries(l.options ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${l.productId}::${l.variantId ?? ""}::${opts}`;
}

export function priceCart(
  input: CartLineInput[],
  catalog: Product[],
  shipping: Pick<ShippingSettings, "standardAmount" | "freeThreshold">,
): CartQuote {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const merged = new Map<string, CartLineInput>();
  for (const l of input) {
    const key = lineKey(l);
    const prev = merged.get(key);
    merged.set(key, { ...l, quantity: Math.min(10, (prev?.quantity ?? 0) + l.quantity) });
  }

  const lines: PricedLine[] = [];
  const removed: CartQuote["removed"] = [];
  for (const l of merged.values()) {
    const p = byId.get(l.productId);
    if (!p || p.status !== "published") {
      removed.push({ productId: l.productId, reason: "Cette pièce n’est plus disponible." });
      continue;
    }
    const activeVariants = p.variants.filter((v) => v.active);
    let variant = null;
    if (l.variantId) {
      variant = activeVariants.find((v) => v.id === l.variantId) ?? null;
      if (!variant) {
        removed.push({ productId: l.productId, reason: "Cette finition n’est plus proposée." });
        continue;
      }
    } else if (activeVariants.length > 0) {
      removed.push({ productId: l.productId, reason: "Veuillez choisir une finition." });
      continue;
    }
    // Options sans incidence sur le prix : chaque option du produit doit avoir une valeur connue.
    const given = l.options ?? {};
    const optionDefs = p.options ?? [];
    const unknownKey = Object.keys(given).some((k) => !optionDefs.some((o) => o.id === k));
    const missing = optionDefs.find((o) => !o.values.some((v) => v.id === given[o.id]));
    if (unknownKey || missing) {
      removed.push({
        productId: l.productId,
        reason: missing ? `Veuillez choisir : ${missing.label.toLowerCase()}.` : "Option invalide.",
      });
      continue;
    }
    const optionLabels = optionDefs.map((o) => o.values.find((v) => v.id === given[o.id])!.label);
    const unitPrice = p.price + (variant?.priceAdjustment ?? 0);
    if (unitPrice < 0) {
      removed.push({ productId: l.productId, reason: "Prix invalide." });
      continue;
    }
    lines.push({
      productId: p.id,
      variantId: variant?.id ?? null,
      options: optionDefs.length
        ? Object.fromEntries(optionDefs.map((o) => [o.id, given[o.id]!]))
        : null,
      slug: p.slug,
      name: p.name,
      reference: variant?.sku ?? p.reference,
      variantName:
        [
          variant
            ? variant.finish && variant.finish !== variant.name
              ? `${variant.name} — ${variant.finish}`
              : variant.name
            : null,
          ...optionLabels,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      unitPrice,
      quantity: l.quantity,
      total: unitPrice * l.quantity,
      art: p.art,
      imageUrl: p.images[0]?.url ?? null,
      isDemo: p.isDemo,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  let shippingAmount: number | null = null;
  if (shipping.standardAmount > 0) {
    shippingAmount =
      shipping.freeThreshold > 0 && subtotal >= shipping.freeThreshold
        ? 0
        : shipping.standardAmount;
  }
  return {
    lines,
    removed,
    subtotal,
    shipping: shippingAmount,
    total: subtotal + (shippingAmount ?? 0),
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
  };
}
