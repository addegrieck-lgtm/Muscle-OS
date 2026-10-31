"use client";

import { createContext, useContext, useState } from "react";

type Ctx = { variantId: string | null; setVariantId: (id: string | null) => void };
const VariantContext = createContext<Ctx | null>(null);

/** Partage la version choisie entre le sélecteur (AddToCart) et la galerie. */
export function VariantProvider({
  initial,
  children,
}: {
  initial: string | null;
  children: React.ReactNode;
}) {
  const [variantId, setVariantId] = useState<string | null>(initial);
  return (
    <VariantContext.Provider value={{ variantId, setVariantId }}>
      {children}
    </VariantContext.Provider>
  );
}

export function useSelectedVariant(): Ctx | null {
  return useContext(VariantContext);
}
