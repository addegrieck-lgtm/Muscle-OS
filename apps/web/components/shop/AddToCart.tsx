"use client";

import { useState } from "react";
import { Button, cn } from "@vaeloria/ui";
import { useCart } from "./cart";

export function AddToCartButton({ productId, name, disabled, className, size = "md" }: { productId: string; name: string; disabled?: boolean; className?: string; size?: "sm" | "md" | "lg" }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <Button
      size={size}
      disabled={disabled}
      className={cn("w-full", className)}
      aria-label={`Ajouter ${name} au panier`}
      onClick={() => {
        add(productId);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
    >
      {disabled ? "Indisponible" : added ? "Ajouté ✓" : "Ajouter"}
      <span className="sr-only" aria-live="polite">{added ? `${name} ajouté au panier` : ""}</span>
    </Button>
  );
}
