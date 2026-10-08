"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { track } from "@/lib/track";

/**
 * Panier local : uniquement des identifiants de produits et des quantités.
 * Aucun prix n'est stocké ni envoyé par le navigateur — l'API recalcule tout.
 */
export interface CartLine {
  productId: string;
  quantity: number;
}

const KEY = "vae-cart-v1";
const MAX_QTY = 20;

interface CartApi {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartApi | null>(null);

function read(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(raw)
      ? raw.filter((l): l is CartLine => typeof l?.productId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0).slice(0, 25)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read());
    setReady(true);
    // Synchronise les onglets ouverts
    const onStorage = (e: StorageEvent) => e.key === KEY && setLines(read());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* stockage indisponible : le panier reste en mémoire pour la visite */
    }
  }, []);

  const api = useMemo<CartApi>(() => ({
    lines,
    ready,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    add: (productId, quantity = 1) => {
      const cur = lines.find((l) => l.productId === productId);
      persist(cur ? lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l)) : [...lines, { productId, quantity }]);
      track("add_to_cart", { product: productId });
    },
    setQuantity: (productId, quantity) =>
      persist(quantity <= 0 ? lines.filter((l) => l.productId !== productId) : lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l))),
    remove: (productId) => {
      persist(lines.filter((l) => l.productId !== productId));
      track("remove_from_cart", { product: productId });
    },
    clear: () => persist([]),
  }), [lines, ready, persist]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart hors de CartProvider");
  return ctx;
}
