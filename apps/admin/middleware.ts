import { NextResponse, type NextRequest } from "next/server";

/**
 * Accès au back-office : compte du site avec le rôle « admin » ou « owner ».
 * Le cookie de session du site (même domaine, chemin /) est vérifié auprès de l'API à chaque requête.
 * Secours facultatif : Basic Auth si ADMIN_USER / ADMIN_PASSWORD sont définis et envoyés (scripts, urgence).
 */
const SESSION_COOKIE = "vae_session";
const STAFF = new Set(["admin", "owner"]);

function basicAuthOk(req: NextRequest): boolean {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  const header = req.headers.get("authorization") ?? "";
  if (!user || !pass || !header.startsWith("Basic ")) return false;
  const [u, ...rest] = atob(header.slice(6)).split(":");
  return u === user && rest.join(":") === pass;
}

export async function middleware(req: NextRequest) {
  if (basicAuthOk(req)) return NextResponse.next();
  const site = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const login = `${site}/login?next=${encodeURIComponent(req.nextUrl.pathname === "/" ? "/admin" : `/admin${req.nextUrl.pathname}`)}`;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(login);

  const res = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/api/v1/me`, {
    headers: { authorization: `Session ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!res) return new NextResponse("Service indisponible", { status: 503 });
  if (res.status === 401) return NextResponse.redirect(login);
  const me = res.ok ? ((await res.json()) as { user: { displayName: string; role: string } }) : null;
  if (!me || !STAFF.has(me.user.role)) {
    return new NextResponse(
      `<!doctype html><meta charset="utf-8"><title>Accès refusé</title><body style="font-family:system-ui;background:#07070a;color:#e6e8ec;display:grid;place-items:center;min-height:100vh;margin:0"><div style="text-align:center"><h1>Accès réservé à l'équipe</h1><p>Ton compte n'a pas accès au back-office.</p><p><a style="color:#d21f2f" href="${site}/compte">Retour à mon compte</a></p></div>`,
      { status: 403, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }
  // Identité transmise aux pages (affichage, journal d'audit, droits « propriétaire »).
  const headers = new Headers(req.headers);
  headers.set("x-admin-name", encodeURIComponent(me.user.displayName));
  headers.set("x-admin-role", me.user.role);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/:path*", runtime: "nodejs" };
