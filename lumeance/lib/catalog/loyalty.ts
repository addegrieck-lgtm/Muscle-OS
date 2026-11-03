import { formatPrice } from "@/lib/money";
import { PRO_TIERS, proPercent } from "@/lib/catalog/pro";
import { ht } from "@/lib/catalog/tax";

/**
 * Avantages des comptes clients (choix du propriétaire, novembre 2026) :
 * • Entreprises validées : remise professionnelle par paliers (lib/catalog/pro.ts), prix HT.
 * • Particuliers : le Cercle Luméance, selon le cumul des commandes payées (TTC) :
 *     Cercle Ivoire dès 1 000 € → −5 %, Cercle Champagne dès 2 500 € → −8 %, à vie.
 * • Parrainage : le filleul a 30 € de remise sur sa 1re commande (dès 300 € de pièces) ; le
 *   parrain reçoit un avoir de 30 € quand cette commande est payée (déclencheur SQL,
 *   migration 20261106000100), utilisable sur une commande dès 300 € de pièces.
 * Les remises en pourcentage ne portent pas sur les pièces déjà en promotion.
 */
export const CIRCLE_LEVELS = [
  { id: "ivoire", name: "Cercle Ivoire", min: 100000, percent: 5 },
  { id: "champagne", name: "Cercle Champagne", min: 250000, percent: 8 },
] as const;
export type CircleLevel = (typeof CIRCLE_LEVELS)[number];

/** À garder identiques au déclencheur SQL grant_referral_credit(). */
export const REFERRAL_AMOUNT = 3000;
export const REFERRAL_MIN_ORDER = 30000;

export const REFERRAL_LABEL = `${formatPrice(REFERRAL_AMOUNT)} offerts au parrain et au filleul, dès ${formatPrice(REFERRAL_MIN_ORDER)} de commande`;

/** Niveau du Cercle atteint pour un cumul d'achats payés (centimes TTC), ou null. */
export function circleLevel(spent: number): CircleLevel | null {
  let level: CircleLevel | null = null;
  for (const l of CIRCLE_LEVELS) if (spent >= l.min) level = l;
  return level;
}

/** Prochain niveau et montant restant à atteindre, ou null au niveau le plus haut. */
export function nextCircleLevel(spent: number): { level: CircleLevel; remaining: number } | null {
  const next = CIRCLE_LEVELS.find((l) => spent < l.min);
  return next ? { level: next, remaining: next.min - spent } : null;
}

/** Contexte du compte connecté, lu côté serveur (jamais transmis par le navigateur). */
export type AccountContext =
  | { type: "entreprise"; proApproved: boolean }
  | {
      type: "particulier";
      /** Cumul TTC des commandes payées. */
      spent: number;
      /** Filleul sans commande payée : remise de parrainage sur cette commande. */
      referredFirstOrder: boolean;
      /** Avoirs de parrainage disponibles (non utilisés). */
      credits: { id: string; amount: number }[];
    };

export interface AccountDiscount {
  kind: "pro" | "cercle" | "filleul" | "avoir";
  label: string;
  amount: number;
}

/**
 * Remises liées au compte, après les offres par lot. `lines` : totaux TTC par ligne et pièce en
 * promotion ou non ; `net` : montant après offres par lot (plafond des remises).
 * Renvoie aussi l'avoir utilisé (un seul par commande).
 */
export function accountDiscounts(
  lines: { total: number; onPromotion: boolean }[],
  net: number,
  ctx: AccountContext | null,
): { discounts: AccountDiscount[]; usedCreditId: string | null } {
  const discounts: AccountDiscount[] = [];
  let usedCreditId: string | null = null;
  if (!ctx) return { discounts, usedCreditId };
  const pieces = lines.reduce((s, l) => s + l.total, 0);
  const eligible = lines.filter((l) => !l.onPromotion).reduce((s, l) => s + l.total, 0);
  let left = net;
  const push = (d: AccountDiscount) => {
    const amount = Math.min(d.amount, left);
    if (amount <= 0) return;
    discounts.push({ ...d, amount });
    left -= amount;
  };

  if (ctx.type === "entreprise") {
    if (!ctx.proApproved) return { discounts, usedCreditId };
    const percent = proPercent(ht(pieces));
    if (percent > 0)
      push({
        kind: "pro",
        label: `Remise professionnelle −${percent} %`,
        amount: Math.round((eligible * percent) / 100),
      });
    return { discounts, usedCreditId };
  }

  const level = circleLevel(ctx.spent);
  if (level)
    push({
      kind: "cercle",
      label: `${level.name} −${level.percent} %`,
      amount: Math.round((eligible * level.percent) / 100),
    });
  if (pieces >= REFERRAL_MIN_ORDER) {
    if (ctx.referredFirstOrder)
      push({ kind: "filleul", label: "Parrainage — bienvenue", amount: REFERRAL_AMOUNT });
    const credit = ctx.credits[0];
    if (credit) {
      const before = discounts.length;
      push({ kind: "avoir", label: "Avoir de parrainage", amount: credit.amount });
      if (discounts.length > before) usedCreditId = credit.id;
    }
  }
  return { discounts, usedCreditId };
}

/** Texte court des paliers pro, pour l'espace client. */
export const PRO_TIERS_SHORT = PRO_TIERS.map(
  (t) => `−${t.percent} % dès ${formatPrice(t.min)} HT`,
).join(" · ");
