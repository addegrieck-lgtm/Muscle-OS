import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { safeNext } from "@/lib/session";

/** Démarre la connexion Discord : état anti-CSRF en cookie, puis redirection vers Discord. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? url.origin).replace(/\/$/, "");
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(`${site}/login?erreur=discord`);
  const state = randomBytes(16).toString("hex");
  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.search = new URLSearchParams({ client_id: clientId, response_type: "code", scope: "identify", redirect_uri: `${site}/api/auth/callback`, state, prompt: "none" }).toString();
  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set("vae_oauth", `${state}|${safeNext(url.searchParams.get("next"))}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
