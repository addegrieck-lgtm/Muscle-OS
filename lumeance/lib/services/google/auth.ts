import "server-only";

/**
 * Jeton d'accès Google pour un compte de service (JWT signé RS256, WebCrypto : fonctionne sur
 * Cloudflare Workers comme sous Node). La clé est lue dans la variable secrète
 * GOOGLE_SERVICE_ACCOUNT_JSON (fichier JSON du compte de service, tel quel ou en base64) ;
 * elle n'est jamais envoyée au navigateur.
 */
export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export function readServiceAccount(
  raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
): ServiceAccount | null {
  if (!raw?.trim()) return null;
  const text = raw.trim().startsWith("{") ? raw : safeAtob(raw.trim());
  try {
    const j = JSON.parse(text ?? "") as Partial<ServiceAccount>;
    if (typeof j.client_email === "string" && typeof j.private_key === "string")
      return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, "\n") };
  } catch {
    /* clé illisible */
  }
  return null;
}

function safeAtob(s: string): string | null {
  try {
    return new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function importKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/** Assertion JWT signée (exportée pour les tests). */
export async function signedAssertion(sa: ServiceAccount, scope: string, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    }),
  );
  const input = `${header}.${claims}`;
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    await importKey(sa.private_key),
    new TextEncoder().encode(input),
  );
  return `${input}.${b64url(sig)}`;
}

const cache = new Map<string, { token: string; until: number }>();

export async function googleAccessToken(sa: ServiceAccount, scope: string): Promise<string> {
  const key = `${sa.client_email}|${scope}`;
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: await signedAssertion(sa, scope),
    }),
    cache: "no-store",
  });
  const j = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !j.access_token)
    throw new Error(`Google : ${j.error_description ?? j.error ?? `HTTP ${res.status}`}`);
  cache.set(key, {
    token: j.access_token,
    until: Date.now() + ((j.expires_in ?? 3600) - 120) * 1000,
  });
  return j.access_token;
}
