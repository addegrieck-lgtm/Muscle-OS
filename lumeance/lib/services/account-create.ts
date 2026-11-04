import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isValidSiret } from "@/lib/validation/account";

/** Données d'inscription nécessaires à la fiche client. */
export interface AccountProfile {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  account_type: "particulier" | "entreprise";
  company_name: string | null;
  siret: string | null;
  vat_number: string | null;
  referral: string | null;
}

/** Copie gardée dans le compte Supabase : permet de recréer la fiche si sa création a échoué. */
export function profileMetadata(p: Omit<AccountProfile, "email">): Record<string, string | null> {
  return { ...p };
}

const str = (v: unknown, max = 160) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

/**
 * Profil relu depuis les métadonnées du compte (modifiables par l'utilisateur : tout est
 * revalidé ; un compte entreprise reste de toute façon « en vérification » jusqu'à validation
 * dans l'administration).
 */
export function profileFromUser(
  user: Pick<User, "email" | "user_metadata">,
): AccountProfile | null {
  if (!user.email) return null;
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  const siret = str(m.siret, 20)?.replace(/\s/g, "") ?? null;
  const entreprise = m.account_type === "entreprise" && !!siret && isValidSiret(siret);
  return {
    email: user.email,
    first_name: str(m.first_name, 80),
    last_name: str(m.last_name, 80),
    phone: str(m.phone, 30),
    account_type: entreprise ? "entreprise" : "particulier",
    company_name: entreprise ? str(m.company_name) : null,
    siret: entreprise ? siret : null,
    vat_number: entreprise ? (str(m.vat_number, 20)?.toUpperCase() ?? null) : null,
    referral: entreprise ? null : (str(m.referral, 20)?.toUpperCase() ?? null),
  };
}

/** Code de parrainage : 8 caractères sans ambiguïté de lecture (pas de 0/O, 1/I). */
export function referralCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => A[b % A.length]).join("");
}

/**
 * Crée la fiche client (table customers, reprise si l'adresse a déjà commandé) et le compte
 * (customer_accounts). Renvoie un message d'erreur technique, ou null si tout est en place.
 */
export async function createCustomerAccount(
  db: SupabaseClient,
  authUserId: string,
  p: AccountProfile,
): Promise<string | null> {
  const {
    data: customer,
    error: cErr,
    status,
  } = await db
    .from("customers")
    .upsert(
      {
        email: p.email,
        ...(p.first_name ? { first_name: p.first_name } : {}),
        ...(p.last_name ? { last_name: p.last_name } : {}),
        ...(p.phone ? { phone: p.phone } : {}),
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();
  if (cErr || !customer)
    return `customers: ${cErr?.code ?? `http${status}`} ${cErr?.message ?? "aucune ligne"}`;

  let referredBy: string | null = null;
  if (p.referral) {
    const { data: sponsor } = await db
      .from("customer_accounts")
      .select("auth_user_id")
      .eq("referral_code", p.referral)
      .maybeSingle();
    referredBy = sponsor?.auth_user_id ?? null;
  }
  const entreprise = p.account_type === "entreprise";
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await db.from("customer_accounts").insert({
      auth_user_id: authUserId,
      customer_id: customer.id,
      account_type: p.account_type,
      company_name: entreprise ? p.company_name : null,
      siret: entreprise ? p.siret : null,
      vat_number: entreprise ? p.vat_number : null,
      pro_status: entreprise ? "pending" : "none",
      referral_code: referralCode(),
      // Le parrainage est réservé aux particuliers (les entreprises ont leurs paliers).
      referred_by: entreprise ? null : referredBy,
    });
    if (!error) return null;
    // Compte déjà créé (deux requêtes simultanées) : rien à faire.
    if (error.code === "23505" && error.message.includes("pkey")) return null;
    // La fiche client appartient déjà à un compte : s'il a été supprimé de Supabase (compte
    // orphelin, ex. utilisateur supprimé puis réinscrit avec la même adresse confirmée), on le
    // rattache au nouveau compte en gardant son historique.
    if (error.code === "23505" && error.message.includes("customer_id"))
      return reclaimOrphan(db, customer.id, authUserId);
    if (error.code !== "23505" || !error.message.includes("referral_code"))
      return `customer_accounts: ${error.code} ${error.message}`;
  }
  return "customer_accounts: code de parrainage introuvable";
}

async function reclaimOrphan(
  db: SupabaseClient,
  customerId: string,
  authUserId: string,
): Promise<string | null> {
  const { data: old } = await db
    .from("customer_accounts")
    .select("auth_user_id")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!old) return "customer_accounts: fiche rattachée introuvable";
  if (old.auth_user_id === authUserId) return null;
  const { data: still } = await db.auth.admin.getUserById(old.auth_user_id);
  if (still?.user) return "customer_accounts: fiche déjà rattachée à un autre compte actif";
  const { error } = await db
    .from("customer_accounts")
    .update({ auth_user_id: authUserId })
    .eq("auth_user_id", old.auth_user_id);
  return error ? `customer_accounts (reprise): ${error.code} ${error.message}` : null;
}
