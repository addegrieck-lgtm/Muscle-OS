import { NextResponse } from "next/server";

/** Relais des événements analytics vers l'API (même origine : pas de CORS, URL de l'API non exposée). */
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 2000) return new NextResponse(null, { status: 413 });
  try {
    await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/api/v1/analytics`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "" },
      body,
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* l'analytics ne doit jamais casser la navigation */
  }
  return new NextResponse(null, { status: 204 });
}
