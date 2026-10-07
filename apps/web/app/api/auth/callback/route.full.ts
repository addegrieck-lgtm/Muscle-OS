import { NextResponse } from "next/server";
import { SESSION_COOKIE, safeNext, sessionCookieOptions } from "@/lib/session";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? url.origin).replace(/\/$/, "");
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)vae_oauth=([^;]+)/)?.[1];
  const [state, next] = decodeURIComponent(cookie ?? "").split("|");
  const code = url.searchParams.get("code");
  if (!code || !state || state !== url.searchParams.get("state")) return NextResponse.redirect(`${site}/login?erreur=etat`);

  const api = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/internal/v1/auth/discord`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-internal-token": process.env.WEB_INTERNAL_TOKEN ?? "" },
    body: JSON.stringify({ code, redirectUri: `${site}/api/auth/callback`, userAgent: req.headers.get("user-agent") ?? undefined }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!api?.ok) return NextResponse.redirect(`${site}/login?erreur=discord`);
  const { token } = (await api.json()) as { token: string };
  const res = NextResponse.redirect(`${site}${safeNext(next)}`);
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  res.cookies.delete("vae_oauth");
  return res;
}
