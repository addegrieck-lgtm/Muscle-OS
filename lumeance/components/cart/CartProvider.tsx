"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLineInput } from "@/lib/validation/schemas";

const KEY = "lumeance.cart.v1";
const TTL_MS = 30 * 24 * 3600 * 1000; // conservation temporaire : 30 jours

interface CartState {
  lines: CartLineInput[];
  ready: boolean;
  count: number;
  add: (line: CartLineInput) => void;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  remove: (productId: string, variantId: string | null) => void;
  clear: () => void;
  lastAdded: number;
}

const CartContext = createContext<CartState | null>(null);

const same = (l: CartLineInput, productId: string, variantId: string | null) =>
  l.productId === productId && l.variantId === variantId;

/** Le panier ne stocke que des identifiants et des quantités : les prix sont toujours
 * recalculés par le serveur (app/actions/cart.ts). */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLineInput[]>([]);
  const [ready, setReady] = useState(false);
  const [lastAdded, setLastAdded] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { at: number; lines: CartLineInput[] };
        if (Date.now() - saved.at < TTL_MS && Array.isArray(saved.lines))
          setLines(saved.lines.slice(0, 30));
      }
    } catch {
      localStorage.removeItem(KEY);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (lines.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), lines }));
  }, [lines, ready]);

  const add = useCallback((line: CartLineInput) => {
    setLines((prev) => {
      const existing = prev.find((l) => same(l, line.productId, line.variantId));
      if (existing)
        return prev.map((l) =>
          same(l, line.productId, line.variantId)
            ? { ...l, quantity: Math.min(10, l.quantity + line.quantity) }
            : l,
        );
      return [...prev, line].slice(0, 30);
    });
    setLastAdded(Date.now());
  }, []);

  const setQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      setLines((prev) =>
        prev.map((l) =>
          same(l, productId, variantId)
            ? { ...l, quantity: Math.max(1, Math.min(10, quantity)) }
            : l,
        ),
      );
    },
    [],
  );

  const remove = useCallback((productId: string, variantId: string | null) => {
    setLines((prev) => prev.filter((l) => !same(l, productId, variantId)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      lastAdded,
    }),
    [lines, ready, add, setQuantity, remove, clear, lastAdded],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
