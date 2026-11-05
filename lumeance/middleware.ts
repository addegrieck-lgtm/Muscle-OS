import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase (administration et comptes clients) sur TOUTES les pages, avant
 * leur rendu : un jeton expiré est renouvelé ici et les nouveaux cookies sont renvoyés au
 * navigateur. Sans cela, une page qui renouvelle le jeton sans pouvoir écrire les cookies
 * (composant serveur) invalide la session et oblige à se reconnecter.
 * Visiteur sans cookie de session : aucun appel à Supabase (coût nul).
 * Ferme aussi l'accès à /admin aux visiteurs non connectés. La vérification du RÔLE
 * administrateur est faite côté serveur dans chaque page/action (lib/auth/admin.ts) et par la RLS.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const isAdmin = path.startsWith("/admin");
  const isLogin = path === "/admin/login";
  if (!url || !key) return NextResponse.next();

  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
  if (!hasSession) {
    if (isAdmin && !isLogin) return redirectToLogin(request);
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getUser() vérifie la session auprès de Supabase et la renouvelle si besoin.
  const { data } = await supabase.auth.getUser();
  if (isAdmin && !data.user && !isLogin) return redirectToLogin(request);
  return response;
}

function redirectToLogin(request: NextRequest) {
  const login = request.nextUrl.clone();
  login.pathname = "/admin/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export const config = {
  // Toutes les pages et routes, sauf fichiers statiques, images et webhook de paiement.
  matcher: [
    "/((?!_next/static|_next/image|api/payments/webhook|favicon|icon|apple-icon|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|txt|xml|woff2?)$).*)",
  ],
};
