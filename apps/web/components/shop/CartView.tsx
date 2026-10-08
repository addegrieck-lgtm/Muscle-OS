"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ShopProduct } from "@vaeloria/types";
import { ButtonLink, EmptyState, formatPrice } from "@vaeloria/ui";
import { useCart } from "./cart";
import { ProductVisual } from "./ProductVisual";

/**
 * Panier : prix affichés depuis le catalogue (mis en cache 30 s). Le montant facturé est
 * recalculé par l'API à l'étape « Résumé » du paiement — c'est le seul qui fait foi.
 */
export function CartView({ products, checkoutEnabled, notice }: { products: ShopProduct[]; checkoutEnabled: boolean; notice?: string | null }) {
  const { lines, ready, setQuantity, remove } = useCart();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const rows = lines.map((l) => ({ line: l, product: byId.get(l.productId) })).filter((r) => r.product) as { line: { productId: string; quantity: number }; product: ShopProduct }[];
  const missing = lines.length - rows.length;
  const total = rows.reduce((s, r) => s + r.product.price.priceCents * r.line.quantity, 0);
  const points = rows.reduce((s, r) => s + r.product.price.points * r.line.quantity, 0);

  if (!ready) return <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface" aria-busy />;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        {notice && <p role="status" className="mb-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">{notice}</p>}
        {missing > 0 && <p className="mb-4 text-sm text-warning">{missing} produit{missing > 1 ? "s ne sont" : " n'est"} plus disponible{missing > 1 ? "s" : ""} et {missing > 1 ? "ont été ignorés" : "a été ignoré"}.</p>}
        {rows.length === 0 ? (
          <EmptyState title="Ton panier est vide">
            <div className="mt-4"><ButtonLink href="/boutique">Découvrir la boutique</ButtonLink></div>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line">
            {rows.map(({ line, product }) => (
              <li key={product.id} className="grid grid-cols-[72px_1fr] gap-3 p-3 sm:grid-cols-[88px_1fr_auto] sm:items-center sm:gap-4 sm:p-4">
                <ProductVisual category={product.categorySlug} imageUrl={product.imageUrl} name={product.name} className="aspect-square" />
                <div className="min-w-0">
                  <Link href={`/boutique/produit/${product.slug}`} className="font-display font-bold uppercase tracking-[0.04em] hover:text-accent">{product.name}</Link>
                  <p className="text-sm text-muted">{formatPrice(product.price.priceCents)} l&apos;unité · <span className="text-accent">+{product.price.points} pts</span></p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-md border border-line" role="group" aria-label={`Quantité de ${product.name}`}>
                      <button type="button" className="size-9 text-lg text-muted hover:text-fg" onClick={() => setQuantity(product.id, line.quantity - 1)} aria-label="Diminuer">−</button>
                      <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{line.quantity}</span>
                      <button type="button" className="size-9 text-lg text-muted hover:text-fg disabled:opacity-40" disabled={line.quantity >= 20} onClick={() => setQuantity(product.id, line.quantity + 1)} aria-label="Augmenter">+</button>
                    </div>
                    <button type="button" onClick={() => remove(product.id)} className="text-sm text-subtle underline-offset-2 hover:text-danger hover:underline">Retirer</button>
                  </div>
                </div>
                <p className="col-start-2 text-right font-display text-lg font-bold tabular-nums sm:col-start-3">{formatPrice(product.price.priceCents * line.quantity)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rows.length > 0 && (
        <aside className="metal-border h-fit rounded-[var(--radius-card)] p-5 lg:sticky lg:top-36">
          <h2 className="font-display text-lg font-bold uppercase tracking-[0.06em]">Récapitulatif</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Articles</dt><dd className="tabular-nums">{rows.reduce((s, r) => s + r.line.quantity, 0)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3"><dt className="font-display font-semibold uppercase tracking-[0.08em]">Total</dt><dd className="font-display text-2xl font-bold tabular-nums">{formatPrice(total)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Points gagnés</dt><dd className="font-display font-semibold text-accent">+{points}</dd></div>
          </dl>
          {checkoutEnabled ? (
            <ButtonLink href="/checkout" size="lg" className="mt-5 w-full">Passer au paiement</ButtonLink>
          ) : (
            <p className="mt-5 rounded-md border border-line p-3 text-center text-sm text-muted">Le paiement ouvrira avec le serveur.</p>
          )}
          <p className="mt-3 text-xs text-subtle">Le montant définitif est confirmé à l&apos;étape « Résumé », avant le paiement.</p>
        </aside>
      )}
    </div>
  );
}
