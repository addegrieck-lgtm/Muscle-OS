"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ht } from "@/lib/catalog/tax";
import { formatPrice } from "@/lib/money";

export interface AccountStatus {
  loggedIn: boolean;
  firstName: string | null;
  /** Compte entreprise validé : prix affichés hors taxes. */
  pro: boolean;
}

const GUEST: AccountStatus = { loggedIn: false, firstName: null, pro: false };
const Ctx = createContext<AccountStatus>(GUEST);

/** État du compte, lu une fois par chargement de page (les pages restent statiques). */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>(GUEST);
  useEffect(() => {
    let alive = true;
    fetch("/api/compte/statut", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : GUEST))
      .then((s: AccountStatus) => alive && setStatus(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return <Ctx.Provider value={status}>{children}</Ctx.Provider>;
}

export const useAccount = () => useContext(Ctx);

/**
 * Prix TTC du catalogue, affiché HT pour un compte entreprise validé. `suffix` : ajoute « TTC »
 * ou « HT » après le montant.
 */
export function Price({
  cents,
  suffix = false,
  suffixClassName,
}: {
  cents: number;
  suffix?: boolean;
  suffixClassName?: string;
}) {
  const { pro } = useAccount();
  return (
    <>
      {formatPrice(pro ? ht(cents) : cents)}
      {suffix && (
        <span className={suffixClassName ?? "t-small ml-3 font-sans text-brun/50"}>
          {pro ? "HT" : "TTC"}
        </span>
      )}
    </>
  );
}
