import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  // Protection CSRF : un formulaire d'un autre site ne peut pas déconnecter le joueur.
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(site).origin && origin !== new URL(req.url).origin) return new NextResponse(null, { status: 403 });
  const token = req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  if (token) {
    await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/api/v1/me/logout`, { method: "POST", headers: { authorization: `Session ${token}` } }).catch(() => {});
  }
  const res = NextResponse.redirect(`${site}/`, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
