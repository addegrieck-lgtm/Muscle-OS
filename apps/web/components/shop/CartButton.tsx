"use client";

import Link from "next/link";
import { cn } from "@vaeloria/ui";
import { useCart } from "./cart";

export function CartButton({ className }: { className?: string }) {
  const { count, ready } = useCart();
  return (
    <Link href="/boutique/panier" className={cn("relative inline-flex size-10 items-center justify-center rounded-md text-fg hover:bg-surface-2", className)} aria-label={`Panier${ready && count ? ` (${count} article${count > 1 ? "s" : ""})` : ""}`}>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7L5 7Z M9 7V5.5a3 3 0 0 1 6 0V7" />
      </svg>
      {ready && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-ruby px-1 text-[10px] font-bold leading-4 text-white">{count}</span>
      )}
    </Link>
  );
}
