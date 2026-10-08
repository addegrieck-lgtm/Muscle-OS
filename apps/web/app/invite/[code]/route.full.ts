import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Lien de parrainage vaeloria.fr/invite/CODE : enregistre le clic (dédoublonné par visiteur et par jour,
 * sans IP), mémorise le code 30 jours pour l'inscription, puis redirige vers « Rejoindre ».
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin).replace(/\/$/, "");
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return NextResponse.redirect(`${site}/rejoindre`);
  const cookieVisitor = req.headers.get("cookie")?.match(/(?:^|;\s*)vae_v=([a-f0-9]{32})/)?.[1];
  const visitor = cookieVisitor ?? randomBytes(16).toString("hex");
  const api = process.env.API_URL ?? "http://localhost:4000";
  const r = await fetch(`${api}/api/v1/referrals/click`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, visitorKey: visitor }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => null);
  const res = NextResponse.redirect(`${site}/rejoindre${r?.status === 204 ? `?invitation=${code}` : ""}`);
  const secure = process.env.NODE_ENV === "production";
  if (r?.status === 204) res.cookies.set("vae_ref", code, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  if (!cookieVisitor) res.cookies.set("vae_v", visitor, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
