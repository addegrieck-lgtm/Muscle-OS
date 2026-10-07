/** Contrats de la boutique, partagés par l'API, le site et l'admin. */

export const DELIVERY_ACTIONS = ["GRANT_RANK", "GIVE_KIT", "GIVE_ITEM", "GIVE_SPAWNER", "ADD_POINTS", "SYNC_PLAYER", "COMMAND"] as const;
export type DeliveryAction = (typeof DELIVERY_ACTIONS)[number];

export const DELIVERY_TYPES = ["RANK", "KIT", "ITEM", "SPAWNER", "PACK", "COSMETIC"] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export type DeliveryStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED" | "CANCELLED";

export interface ShopCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

/** Prix et points tels qu'ils seront réellement facturés et crédités (calculés par l'API). */
export interface ShopPrice {
  originalCents: number;
  priceCents: number;
  points: number;
  basePoints: number;
  promotion: { id: string; label: string; endsAt: string | null } | null;
}

export interface ShopProduct {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  categorySlug: string;
  deliveryType: DeliveryType;
  imageUrl: string | null;
  currency: "EUR";
  stock: number | null;
  price: ShopPrice;
  /** Clé du grade débloqué par ce produit (catégorie Grades). */
  rankKey: string | null;
}

export interface RankThreshold {
  key: string;
  name: string;
  minPoints: number;
  color: string | null;
  perks: string[];
}

export interface RankProgress {
  points: number;
  current: RankThreshold;
  next: RankThreshold | null;
  /** Points manquants pour le prochain grade (0 si grade maximal atteint). */
  missing: number;
  /** Progression vers le prochain grade, 0–100 (100 si grade maximal). */
  percent: number;
  /** Progression vers le grade le plus élevé (VÆLORIAN dans la configuration initiale). */
  top: { rank: RankThreshold; percent: number; unlocked: boolean };
}

export interface ShopCatalog {
  categories: ShopCategory[];
  products: ShopProduct[];
  ranks: RankThreshold[];
  promotions: { id: string; name: string; label: string | null; endsAt: string | null }[];
}

export interface QuoteLine {
  productId: string;
  slug: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  unitOriginalCents: number;
  unitPoints: number;
  totalCents: number;
  totalPoints: number;
}

export interface Quote {
  lines: QuoteLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  totalPoints: number;
  currency: "EUR";
  /** Lignes ignorées (produit inactif, stock épuisé…). */
  rejected: { productId: string; reason: string }[];
}

export interface OrderView {
  publicId: string;
  status: "pending" | "paid" | "fulfilled" | "partially_refunded" | "refunded" | "cancelled" | "failed" | "expired";
  recipient: { uuid: string; username: string };
  totalCents: number;
  pointsTotal: number;
  createdAt: string;
  paidAt: string | null;
  items: { name: string; quantity: number; unitPriceCents: number; points: number }[];
  deliveries: { label: string; status: DeliveryStatus; deliveredAt: string | null }[];
  recipientOnline: boolean;
}

export interface PointsEntry {
  id: number;
  delta: number;
  balanceAfter: number;
  reason: "purchase" | "refund" | "promotion_bonus" | "admin_adjustment";
  label: string;
  orderPublicId: string | null;
  createdAt: string;
}

export interface LinkedMinecraft {
  uuid: string;
  username: string;
  rank: string | null;
  progress: RankProgress;
}

export interface Me {
  user: { id: string; displayName: string; avatarUrl: string | null; role: string };
  minecraft: LinkedMinecraft[];
}
