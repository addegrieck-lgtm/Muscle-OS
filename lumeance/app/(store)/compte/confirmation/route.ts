import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Retour des liens envoyés par e-mail (confirmation d'inscription, nouveau mot de passe) :
 * ouvre la session puis redirige vers une page interne.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const nextParam = url.searchParams.get("next") ?? "";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/compte?bienvenue=1";
  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type)
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  const dest = url.clone();
  dest.search = "";
  if (ok) {
    const [path, query] = next.split("?");
    dest.pathname = path!;
    if (query) dest.search = `?${query}`;
  } else {
    dest.pathname = "/compte/connexion";
    dest.search = "?lien=expire";
  }
  return NextResponse.redirect(dest);
}
