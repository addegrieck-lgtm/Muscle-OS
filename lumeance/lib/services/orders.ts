import type { OrderStatus, PaymentStatus } from "@/lib/validation/schemas";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Brouillon",
  pending_payment: "En attente de paiement",
  paid: "Payée",
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Non payée",
  pending: "Paiement en cours",
  paid: "Paiement confirmé",
  failed: "Paiement échoué",
  partially_refunded: "Remboursement partiel",
  refunded: "Remboursée",
};

/** Transitions autorisées depuis l'administration. Les statuts « payée » et « remboursée »
 * ne sont jamais posés à la main : ils découlent d'un paiement / remboursement confirmé. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending_payment", "cancelled"],
  pending_payment: ["draft", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

const REQUIRES_PAYMENT: OrderStatus[] = ["paid", "preparing", "shipped", "delivered"];

export function allowedTransitions(from: OrderStatus, payment: PaymentStatus): OrderStatus[] {
  const paid = payment === "paid" || payment === "partially_refunded";
  return TRANSITIONS[from].filter((to) => !REQUIRES_PAYMENT.includes(to) || paid);
}

export function canTransition(from: OrderStatus, to: OrderStatus, payment: PaymentStatus): boolean {
  return allowedTransitions(from, payment).includes(to);
}

/** Échappement CSV (RFC 4180) + neutralisation des injections de formules tableur. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  // Séparateur « ; » et BOM UTF-8 : ouverture directe dans un tableur configuré en français.
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

export function centsToCsv(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
