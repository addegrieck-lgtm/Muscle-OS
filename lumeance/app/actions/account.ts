"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { signupErrorMessage } from "@/lib/services/signup-errors";
import { clientIp } from "@/lib/services/rate-limit";
import { allowRequest } from "@/lib/services/request-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  newPasswordSchema,
  resetSchema,
  signinSchema,
  signupSchema,
} from "@/lib/validation/account";

export interface AccountFormState {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
  /** Saisie renvoyée après une erreur (jamais le mot de passe) pour ne pas vider le formulaire. */
  values?: Record<string, string>;
}

const keep = (form: FormData): Record<string, string> =>
  Object.fromEntries(
    [...form.entries()].filter(
      ([k, v]) =>
        typeof v === "string" &&
        !["password", "confirm", "website"].includes(k) &&
        !k.startsWith("$"),
    ) as [string, string][],
  );

const UNAVAILABLE = "Les comptes clients ouvriront prochainement.";

const fieldErrors = (issues: { path: PropertyKey[]; message: string }[]) =>
  Object.fromEntries(issues.map((i) => [String(i.path[0] ?? "form"), i.message]));

const ip = async () => clientIp(await headers());

/** Code de parrainage : 8 caractères sans ambiguïté de lecture (pas de 0/O, 1/I). */
function referralCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => A[b % A.length]).join("");
}

/** Chemin interne uniquement (évite les redirections ouvertes). */
const safeNext = (v: FormDataEntryValue | string | null | undefined, fallback = "/compte") => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : fallback;
};

export async function signUpAccount(
  _: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  if (!(await allowRequest(`signup:${await ip()}`, 5, 15 * 60_000, "FORMS_LIMITER")))
    return { ok: false, message: "Trop de tentatives. Merci de réessayer dans quelques minutes." };
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Merci de vérifier le formulaire.",
      errors: fieldErrors(parsed.error.issues),
      values: keep(form),
    };
  const d = parsed.data;
  if (d.website) return { ok: true, message: "Merci." };
  const db = createSupabaseServiceClient();
  if (!isSupabaseConfigured() || !db)
    return { ok: false, message: UNAVAILABLE, values: keep(form) };

  // Même réponse que l'adresse soit nouvelle ou déjà inscrite (pas de divulgation des comptes).
  const done: AccountFormState = {
    ok: true,
    message:
      "Merci. Un e-mail de confirmation vient de vous être envoyé : cliquez sur le lien qu’il contient pour activer votre compte.",
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: {
      emailRedirectTo: `${siteUrl}/compte/confirmation`,
      data: { first_name: d.first_name },
    },
  });
  if (error) {
    console.error("signup:", error.code, error.status, error.message);
    const known = signupErrorMessage(error.code, error.message);
    if (known) return { ok: false, values: keep(form), ...known };
    if (/password/i.test(error.message))
      return {
        ok: false,
        message: "Mot de passe refusé : choisissez-en un plus robuste.",
        errors: { password: "Mot de passe trop faible ou trop courant" },
        values: keep(form),
      };
    return {
      ok: false,
      message: "L’inscription n’a pas abouti. Merci de réessayer plus tard.",
      values: keep(form),
    };
  }
  const user = data.user;
  // Adresse déjà inscrite : Supabase renvoie un utilisateur sans identité ; rien n'est créé.
  if (!user || (user.identities && user.identities.length === 0)) return done;

  const { data: customer, error: cErr } = await db
    .from("customers")
    .upsert(
      {
        email: d.email,
        first_name: d.first_name,
        last_name: d.last_name,
        ...(d.phone ? { phone: d.phone } : {}),
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();
  if (cErr || !customer) {
    console.error("signup customer:", cErr?.code, cErr?.message);
    return {
      ok: false,
      message: "L’inscription n’a pas abouti. Merci de réessayer plus tard.",
      values: keep(form),
    };
  }

  let referredBy: string | null = null;
  if (d.referral) {
    const { data: sponsor } = await db
      .from("customer_accounts")
      .select("auth_user_id")
      .eq("referral_code", d.referral)
      .maybeSingle();
    referredBy = sponsor?.auth_user_id ?? null;
  }
  const entreprise = d.account_type === "entreprise";
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error: aErr } = await db.from("customer_accounts").insert({
      auth_user_id: user.id,
      customer_id: customer.id,
      account_type: d.account_type,
      company_name: entreprise ? d.company_name : null,
      siret: entreprise ? d.siret : null,
      vat_number: entreprise ? d.vat_number : null,
      pro_status: entreprise ? "pending" : "none",
      referral_code: referralCode(),
      // Le parrainage est réservé aux particuliers (les entreprises ont leurs paliers).
      referred_by: entreprise ? null : referredBy,
    });
    if (!aErr) break;
    if (aErr.code !== "23505" || !aErr.message.includes("referral_code")) {
      console.error("signup account:", aErr.code, aErr.message);
      return {
        ok: false,
        message: "L’inscription n’a pas abouti. Merci de réessayer plus tard.",
        values: keep(form),
      };
    }
  }

  if (d.newsletter) {
    await db.from("newsletter_subscribers").upsert(
      {
        email: d.email,
        consent_timestamp: new Date().toISOString(),
        consent_source: "inscription",
        status: "subscribed",
      },
      { onConflict: "email" },
    );
  }
  return done;
}

export async function signInAccount(
  _: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  if (!isSupabaseConfigured()) return { ok: false, message: UNAVAILABLE };
  if (!(await allowRequest(`account-login:${await ip()}`, 8, 15 * 60_000, "LOGIN_LIMITER")))
    return { ok: false, message: "Trop de tentatives. Réessayez dans 15 minutes." };
  const parsed = signinSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { ok: false, message: "E-mail ou mot de passe incorrect.", values: keep(form) };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/confirm/i.test(error.message))
      return {
        ok: false,
        message: "Confirmez d’abord votre adresse e-mail grâce au lien reçu.",
        values: keep(form),
      };
    return { ok: false, message: "E-mail ou mot de passe incorrect.", values: keep(form) };
  }
  redirect(safeNext(form.get("next")));
}

export async function signOutAccount() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(
  _: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  if (!isSupabaseConfigured()) return { ok: false, message: UNAVAILABLE };
  if (!(await allowRequest(`reset:${await ip()}`, 3, 15 * 60_000, "FORMS_LIMITER")))
    return { ok: false, message: "Trop de demandes. Merci de réessayer plus tard." };
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Adresse e-mail invalide.",
      errors: { email: "Adresse e-mail invalide" },
    };
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/compte/confirmation?next=/compte/nouveau-mot-de-passe`,
  });
  return {
    ok: true,
    message:
      "Si un compte existe pour cette adresse, un e-mail vous permettra de choisir un nouveau mot de passe.",
  };
}

export async function updatePassword(
  _: AccountFormState,
  form: FormData,
): Promise<AccountFormState> {
  if (!isSupabaseConfigured()) return { ok: false, message: UNAVAILABLE };
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Merci de vérifier le formulaire.",
      errors: fieldErrors(parsed.error.issues),
    };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return {
      ok: false,
      message: "Le lien a expiré : refaites une demande de nouveau mot de passe.",
    };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: "Mot de passe refusé : choisissez-en un plus robuste." };
  return { ok: true, message: "Votre mot de passe est modifié." };
}

/**
 * Validation d'un lien reçu par e-mail (inscription, nouveau mot de passe), déclenchée par un
 * clic sur un bouton : les robots des messageries (Outlook, Gmail…) qui ouvrent les liens pour
 * les analyser ne soumettent pas de formulaire, le lien à usage unique n'est donc pas consommé.
 * Le jeton (token_hash) ne dépend pas du navigateur : le lien fonctionne même ouvert ailleurs.
 */
export async function confirmEmailLink(form: FormData) {
  const next = safeNext(form.get("next"), "/compte?bienvenue=1");
  const tokenHash = String(form.get("token_hash") ?? "");
  const type = String(form.get("type") ?? "");
  const code = String(form.get("code") ?? "");
  let ok = false;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    if (
      tokenHash &&
      ["email", "signup", "recovery", "email_change", "invite", "magiclink"].includes(type)
    ) {
      ok = !(
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "email" | "signup" | "recovery" | "email_change" | "invite" | "magiclink",
        })
      ).error;
    } else if (code) {
      ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
    }
  }
  redirect(ok ? next : "/compte/connexion?lien=expire");
}
