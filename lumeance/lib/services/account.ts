import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import type { AccountContext } from "@/lib/catalog/loyalty";
import { createCustomerAccount, profileFromUser } from "@/lib/services/account-create";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export interface CustomerAccount {
  authUserId: string;
  email: string;
  customerId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  type: "particulier" | "entreprise";
  companyName: string | null;
  siret: string | null;
  vatNumber: string | null;
  proStatus: "none" | "pending" | "approved" | "rejected";
  referralCode: string;
  referred: boolean;
  /** Cumul TTC des commandes payées. */
  spent: number;
  paidOrders: number;
  credits: { id: string; amount: number }[];
}

const PAID = ["paid", "partially_refunded"];

/**
 * Compte client de la session en cours (null si visiteur, administrateur sans compte client ou
 * Supabase non configuré). L'identité vient du jeton de session vérifié par Supabase ; les
 * données sont lues avec la clé de service, filtrées sur cet identifiant.
 */
export const getCurrentAccount = cache(async (): Promise<CustomerAccount | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const db = createSupabaseServiceClient();
  if (!user || !db) return null;
  const read = () =>
    db
      .from("customer_accounts")
      .select(
        "auth_user_id, customer_id, account_type, company_name, siret, vat_number, pro_status, referral_code, referred_by, customers(email, first_name, last_name, phone)",
      )
      .eq("auth_user_id", user.id)
      .maybeSingle();
  let { data: acc } = await read();
  if (!acc) {
    // Adresse confirmée mais fiche absente (création interrompue à l'inscription) : on la
    // recrée à partir des données gardées dans le compte, sauf pour un administrateur.
    const { data: admin } = await db
      .from("admin_users")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    const profile = profileFromUser(user);
    if (admin || !user.email_confirmed_at || !profile) return null;
    const failed = await createCustomerAccount(db, user.id, profile);
    if (failed) {
      console.error("account repair:", failed);
      return null;
    }
    ({ data: acc } = await read());
    if (!acc) return null;
  }
  const [{ data: orders }, { data: credits }] = await Promise.all([
    db.from("orders").select("total").eq("customer_id", acc.customer_id).in("payment_status", PAID),
    db
      .from("referral_credits")
      .select("id, amount")
      .eq("account_id", user.id)
      .is("used_at", null)
      .order("created_at"),
  ]);
  const c = (Array.isArray(acc.customers) ? acc.customers[0] : acc.customers) as {
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
  return {
    authUserId: user.id,
    email: c?.email ?? user.email ?? "",
    customerId: acc.customer_id,
    firstName: c?.first_name ?? null,
    lastName: c?.last_name ?? null,
    phone: c?.phone ?? null,
    type: acc.account_type,
    companyName: acc.company_name,
    siret: acc.siret,
    vatNumber: acc.vat_number,
    proStatus: acc.pro_status,
    referralCode: acc.referral_code,
    referred: Boolean(acc.referred_by),
    spent: (orders ?? []).reduce((s, o) => s + Number(o.total), 0),
    paidOrders: (orders ?? []).length,
    credits: (credits ?? []).map((x) => ({ id: x.id, amount: Number(x.amount) })),
  };
});

/** Contexte utilisé par le calcul du panier. */
export function accountContext(a: CustomerAccount | null): AccountContext | null {
  if (!a) return null;
  if (a.type === "entreprise")
    return { type: "entreprise", proApproved: a.proStatus === "approved" };
  return {
    type: "particulier",
    spent: a.spent,
    referredFirstOrder: a.referred && a.paidOrders === 0,
    credits: a.credits,
  };
}
