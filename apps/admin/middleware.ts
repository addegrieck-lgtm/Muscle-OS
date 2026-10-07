import { NextResponse, type NextRequest } from "next/server";

/**
 * Protection Phase 1 : Basic Auth sur tout le back-office (HTTPS obligatoire en production).
 * Refuse tout accès si les identifiants ne sont pas configurés.
 */
export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  const header = req.headers.get("authorization") ?? "";
  if (user && pass && header.startsWith("Basic ")) {
    const [u, ...rest] = atob(header.slice(6)).split(":");
    if (u === user && rest.join(":") === pass) return NextResponse.next();
  }
  return new NextResponse("Authentification requise", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="VAELORIA Admin", charset="UTF-8"' } });
}

export const config = { matcher: "/:path*" };
