import { NextResponse } from "next/server";
import { getMe } from "@/lib/session";

/** Progression du premier compte Minecraft lié (carte de la boutique). */
export async function GET() {
  const me = await getMe().catch(() => null);
  if (!me) return NextResponse.json({ loggedIn: false }, { status: 401, headers: { "cache-control": "no-store" } });
  const mc = me.minecraft[0] ?? null;
  return NextResponse.json({ loggedIn: true, username: mc?.username ?? null, progress: mc?.progress ?? null }, { headers: { "cache-control": "private, no-store" } });
}
