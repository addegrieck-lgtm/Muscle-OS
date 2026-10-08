/**
 * Moteur de prix et de points — fonctions pures, sans accès base (testées unitairement).
 * C'est la seule source de vérité des montants facturés et des points crédités.
 */
import type { RankProgress, RankThreshold, ShopPrice } from "@vaeloria/types";

export interface PricedProduct {
  id: string;
  categoryId: string;
  priceCents: number;
  /** Points fixés à la main ; null = calculés depuis le prix payé. */
  points: number | null;
}

export interface PromotionRule {
  id: string;
  name: string;
  label: string | null;
  kind: "percent" | "fixed" | "points_bonus";
  value: number;
  targetType: "all" | "category" | "product";
  targetId: string | null;
  startsAt: Date;
  endsAt: Date | null;
  active: boolean;
}

export function promotionApplies(p: PromotionRule, product: PricedProduct, now: Date): boolean {
  if (!p.active || p.startsAt > now || (p.endsAt && p.endsAt <= now)) return false;
  if (p.targetType === "all") return true;
  if (p.targetType === "category") return p.targetId === product.categoryId;
  return p.targetId === product.id;
}

/** Points par défaut : 1 € dépensé = `pointsPerEuro` point(s), arrondi à l'inférieur. */
export function defaultPoints(paidCents: number, pointsPerEuro: number): number {
  return Math.floor((paidCents * pointsPerEuro) / 100);
}

/**
 * Règles :
 * - parmi les réductions applicables (% ou montant fixe), la plus avantageuse pour le joueur est retenue (pas de cumul) ;
 * - le prix ne descend jamais sous 0 ;
 * - points de base = points fixés sur le produit, sinon calculés sur le prix réellement payé ;
 * - parmi les bonus de points applicables, le plus élevé est ajouté (pas de cumul).
 */
export function priceProduct(product: PricedProduct, promotions: PromotionRule[], pointsPerEuro: number, now = new Date()): ShopPrice & { promotionId: string | null } {
  const live = promotions.filter((p) => promotionApplies(p, product, now));
  let priceCents = product.priceCents;
  let discount: PromotionRule | null = null;
  for (const p of live) {
    if (p.kind === "points_bonus") continue;
    const candidate = Math.max(0, p.kind === "percent" ? Math.round((product.priceCents * (100 - p.value)) / 100) : product.priceCents - p.value);
    if (candidate < priceCents) {
      priceCents = candidate;
      discount = p;
    }
  }
  const bonus = live.filter((p) => p.kind === "points_bonus").sort((a, b) => b.value - a.value)[0] ?? null;
  const basePoints = product.points ?? defaultPoints(priceCents, pointsPerEuro);
  const shown = discount ?? bonus;
  return {
    originalCents: product.priceCents,
    priceCents,
    basePoints,
    points: basePoints + (bonus?.value ?? 0),
    promotion: shown ? { id: shown.id, label: shown.label ?? shown.name, endsAt: shown.endsAt?.toISOString() ?? null } : null,
    promotionId: discount?.id ?? bonus?.id ?? null,
  };
}

/** Grade et progression à partir des seuils lus en base (jamais codés en dur). */
export function rankProgress(points: number, thresholds: RankThreshold[]): RankProgress {
  const sorted = [...thresholds].sort((a, b) => a.minPoints - b.minPoints);
  if (sorted.length === 0 || sorted[0]!.minPoints > 0) {
    sorted.unshift({ key: "joueur", name: "Joueur", minPoints: 0, color: null, perks: [] });
  }
  let current = sorted[0]!;
  for (const t of sorted) if (t.minPoints <= points) current = t;
  const next = sorted.find((t) => t.minPoints > points) ?? null;
  const top = sorted[sorted.length - 1]!;
  const pct = (value: number, target: number) => (target <= 0 ? 100 : Math.min(100, Math.floor((value / target) * 100)));
  return {
    points,
    current,
    next,
    missing: next ? next.minPoints - points : 0,
    percent: next ? pct(points, next.minPoints) : 100,
    top: { rank: top, percent: pct(points, top.minPoints), unlocked: points >= top.minPoints },
  };
}
