import { NextResponse } from "next/server";
import { sessionToken } from "@/lib/session";

/**
 * Passerelle des actions joueur du monde V2 (le navigateur ne connaît jamais l'URL de l'API).
 * Liste blanche stricte des routes ; contrôle d'origine sur les écritures (CSRF).
 */
const ROUTES: Record<string, { method: string; target: string }> = {
  "GET me": { method: "GET", target: "/api/v1/me/world" },
  "POST empire": { method: "POST", target: "/api/v1/me/empire" },
  "PATCH empire": { method: "PATCH", target: "/api/v1/me/empire" },
  "POST empire/join": { method: "POST", target: "/api/v1/me/empire/join" },
  "POST empire/leave": { method: "POST", target: "/api/v1/me/empire/leave" },
  "POST vote": { method: "POST", target: "/api/v1/me/votes" },
  "GET server-votes": { method: "GET", target: "/api/v1/me/server-votes" },
};

/** « J'ai voté » : la clé du site de vote fait partie du chemin. */
function dynamicRoute(method: string, path: string[]): { method: string; target: string; relayIp?: boolean } | undefined {
  if (method === "POST" && path.length === 3 && path[0] === "server-votes" && path[2] === "claim" && /^[a-z0-9-]{2,40}$/.test(path[1]!)) {
    return { method: "POST", target: `/api/v1/me/server-votes/${path[1]}/claim`, relayIp: true };
  }
  return undefined;
}

/**
 * IP du visiteur pour la vérification des votes. Caddy remplace l'en-tête X-Forwarded-For par l'IP
 * de connexion (ou, derrière un proxy de confiance déclaré, y ajoute celle-ci après l'IP réelle) :
 * la première valeur est donc l'IP du joueur.
 */
function visitorIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim();
}

async function handle(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path;
  const route: { method: string; target: string; relayIp?: boolean } | undefined = ROUTES[`${req.method} ${path.join("/")}`] ?? dynamicRoute(req.method, path);
  if (!route) return NextResponse.json({ error: { message: "Route inconnue" } }, { status: 404 });
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    const site = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : null;
    if (origin && origin !== new URL(req.url).origin && origin !== site) return NextResponse.json({ error: { message: "Origine refusée" } }, { status: 403 });
  }
  const token = await sessionToken();
  // Visiteur anonyme : simple état (200) pour la lecture, pas une erreur réseau dans la console.
  if (!token && req.method === "GET") return NextResponse.json({ anonymous: true }, { headers: { "cache-control": "no-store" } });
  if (!token) return NextResponse.json({ error: { code: "unauthorized", message: "Connexion requise" } }, { status: 401 });
  const api = process.env.API_URL ?? "http://localhost:4000";
  const res = await fetch(`${api}${route.target}`, {
    method: route.method,
    headers: {
      authorization: `Session ${token}`,
      ...(req.method !== "GET" ? { "content-type": "application/json" } : {}),
      ...(route.relayIp ? { "x-internal-token": process.env.WEB_INTERNAL_TOKEN ?? "", "x-vaeloria-client-ip": visitorIp(req) } : {}),
    },
    body: req.method !== "GET" ? await req.text() : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res) return NextResponse.json({ error: { message: "Service indisponible" } }, { status: 503 });
  if (route.target === "/api/v1/me/world" && res.ok) {
    // Ajoute l'identité minimale (nom affiché) pour les îlots de l'interface.
    const meRes = await fetch(`${api}/api/v1/me`, { headers: { authorization: `Session ${token}` }, cache: "no-store" }).catch(() => null);
    const me = meRes?.ok ? ((await meRes.json()) as { user: { displayName: string }; minecraft: { username: string }[] }) : null;
    const world = await res.json();
    return NextResponse.json({ loggedIn: true, displayName: me?.user.displayName ?? null, minecraft: me?.minecraft[0]?.username ?? null, ...world }, { headers: { "cache-control": "private, no-store" } });
  }
  const body = res.status === 204 ? null : await res.text();
  return new NextResponse(body, { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export { handle as GET, handle as POST, handle as PATCH };
