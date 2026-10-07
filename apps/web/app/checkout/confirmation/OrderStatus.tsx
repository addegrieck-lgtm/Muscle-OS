"use client";

import { useEffect, useState } from "react";
import type { OrderView } from "@vaeloria/types";
import { Badge, ButtonLink, Diamond, formatPrice } from "@vaeloria/ui";
import { useCart } from "@/components/shop/cart";
import { orderStatus } from "@/lib/shop/actions.full";

const DELIVERY_LABEL = { PENDING: "En attente", PROCESSING: "En cours", DELIVERED: "Livré", FAILED: "Incident — le support est prévenu", CANCELLED: "Annulé" } as const;
const PAID = new Set(["paid", "fulfilled"]);

/**
 * La page de retour ne valide rien : elle interroge l'API jusqu'à ce que le webhook
 * du prestataire ait confirmé le paiement, puis suit la livraison en jeu.
 */
export function OrderStatus({ initial }: { initial: OrderView }) {
  const [order, setOrder] = useState(initial);
  const { clear } = useCart();
  const done = order.deliveries.length > 0 && order.deliveries.every((d) => d.status === "DELIVERED" || d.status === "CANCELLED");

  useEffect(() => {
    if (PAID.has(order.status)) clear();
  }, [order.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (done || ["failed", "cancelled", "expired", "refunded"].includes(order.status)) return;
    const t = window.setInterval(async () => {
      const r = await orderStatus(order.publicId);
      if (r.ok) setOrder(r.data);
    }, PAID.has(order.status) ? 5000 : 2500);
    return () => window.clearInterval(t);
  }, [order.status, order.publicId, done]);

  if (!PAID.has(order.status)) {
    const failed = ["failed", "cancelled", "expired"].includes(order.status);
    return (
      <div className="metal-border rounded-[var(--radius-card)] p-6 text-center">
        <p className="font-display text-2xl font-bold uppercase tracking-[0.05em]">{failed ? "Paiement non abouti" : "Confirmation du paiement…"}</p>
        <p className="mt-2 text-muted">
          {failed ? "Aucun montant n'a été débité. Tu peux réessayer depuis ton panier." : "Nous attendons la confirmation de notre prestataire de paiement. Cela prend généralement quelques secondes."}
        </p>
        <p className="mt-3 font-mono text-sm text-subtle">Commande {order.publicId}</p>
        {failed && <ButtonLink href="/boutique/panier" className="mt-5">Retour au panier</ButtonLink>}
      </div>
    );
  }

  return (
    <div className="metal-border rounded-[var(--radius-card)] p-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3"><Diamond /><p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">Merci</p><Diamond /></div>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[0.05em]">Commande confirmée</h2>
        <p className="mt-1 font-mono text-sm text-muted">Commande {order.publicId}</p>
        <p className="mt-4 font-display text-3xl font-bold text-accent">+{order.pointsTotal} points</p>
      </div>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {order.items.map((i) => (
          <li key={i.name} className="flex justify-between py-2 text-sm"><span>{i.name}{i.quantity > 1 ? ` ×${i.quantity}` : ""}</span><span className="tabular-nums text-muted">{formatPrice(i.unitPriceCents * i.quantity)}</span></li>
        ))}
      </ul>
      <h3 className="mt-6 font-display text-sm font-semibold uppercase tracking-[0.12em]">Livraison pour {order.recipient.username}</h3>
      <p className="mt-1 text-sm text-muted">
        {done
          ? "Tout a été livré en jeu."
          : order.recipientOnline
            ? "Ton achat est en cours de livraison automatique en jeu."
            : "Ton achat sera livré automatiquement à ta prochaine connexion."}
      </p>
      <ul className="mt-3 space-y-1.5">
        {order.deliveries.map((d, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-sm">
            <span>{d.label}</span>
            <Badge tone={d.status === "DELIVERED" ? "success" : d.status === "FAILED" ? "danger" : "neutral"}>{DELIVERY_LABEL[d.status]}</Badge>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/compte" variant="secondary">Mon compte</ButtonLink>
        <ButtonLink href="/boutique" variant="ghost">Retour à la boutique</ButtonLink>
      </div>
    </div>
  );
}
