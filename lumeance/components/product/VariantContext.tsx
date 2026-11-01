"use client";

import { createContext, useContext, useState } from "react";

type Ctx = {
  variantId: string | null;
  setVariantId: (id: string | null) => void;
  options: Record<string, string>;
  setOption: (id: string, value: string) => void;
};
const VariantContext = createContext<Ctx | null>(null);

/** Partage la version et les options choisies entre le sélecteur (AddToCart) et la galerie. */
export function VariantProvider({
  initial,
  initialOptions = {},
  children,
}: {
  initial: string | null;
  initialOptions?: Record<string, string>;
  children: React.ReactNode;
}) {
  const [variantId, setVariantId] = useState<string | null>(initial);
  const [options, setOptions] = useState<Record<string, string>>(initialOptions);
  const setOption = (id: string, value: string) => setOptions((o) => ({ ...o, [id]: value }));
  return (
    <VariantContext.Provider value={{ variantId, setVariantId, options, setOption }}>
      {children}
    </VariantContext.Provider>
  );
}

export function useSelectedVariant(): Ctx | null {
  return useContext(VariantContext);
}
