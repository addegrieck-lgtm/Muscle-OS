"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setWishlistItem, syncWishlist } from "@/app/actions/wishlist";

const KEY = "lumeance.wishlist.v1";
const MAX = 100;

interface WishlistState {
  ids: string[];
  ready: boolean;
  /** Liste enregistrée dans le compte (retrouvée sur tous les appareils). */
  synced: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => void;
}

const Ctx = createContext<WishlistState | null>(null);

function readLocal(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids)
      ? ids.filter((x): x is string => typeof x === "string").slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(KEY, JSON.stringify(ids));
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage indisponible (navigation privée stricte) : liste en mémoire seulement */
  }
}

/**
 * Liste d'envies : gardée dans le navigateur pour tous ; fusionnée dans le compte et
 * synchronisée dès que le client est connecté.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [synced, setSynced] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIds(readLocal());
    setReady(true);
  }, []);

  // Synchronisation avec le compte : au chargement, puis à chaque page tant que le visiteur
  // n'est pas connecté (une connexion se fait sans recharger la page).
  useEffect(() => {
    if (synced) return;
    let alive = true;
    syncWishlist(readLocal())
      .then((remote) => {
        if (!alive || !remote) return;
        setIds(remote);
        writeLocal(remote);
        setSynced(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [pathname, synced]);

  const toggle = useCallback(
    (productId: string) => {
      const saved = !ids.includes(productId);
      const next = saved ? [productId, ...ids].slice(0, MAX) : ids.filter((x) => x !== productId);
      setIds(next);
      writeLocal(next);
      // Déconnecté entre-temps : la liste redevient locale.
      if (synced)
        setWishlistItem(productId, saved)
          .then((ok) => ok || setSynced(false))
          .catch(() => {});
    },
    [ids, synced],
  );

  const value = useMemo(
    () => ({ ids, ready, synced, has: (id: string) => ids.includes(id), toggle }),
    [ids, ready, synced, toggle],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist(): WishlistState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWishlist hors de WishlistProvider");
  return ctx;
}

/** Cœur « Ajouter à mes envies ». */
export function WishlistButton({
  productId,
  productName,
  className = "",
  tone = "dark",
}: {
  productId: string;
  productName: string;
  className?: string;
  /** « light » : sur une image sombre. */
  tone?: "dark" | "light";
}) {
  const { has, toggle, ready } = useWishlist();
  const saved = ready && has(productId);
  const color = tone === "light" ? "text-ivoire" : "text-brun";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      aria-pressed={saved}
      aria-label={
        saved ? `Retirer ${productName} de mes envies` : `Ajouter ${productName} à mes envies`
      }
      title={saved ? "Retirer de mes envies" : "Ajouter à mes envies"}
      className={`flex items-center justify-center transition-transform duration-300 hover:scale-110 ${color} ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.2}
        aria-hidden
      >
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
      </svg>
    </button>
  );
}
