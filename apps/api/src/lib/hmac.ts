import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Fenêtre d'acceptation d'une requête signée (anti-rejeu combiné au nonce). */
export const SIGNATURE_MAX_SKEW_MS = 5 * 60 * 1000;

/** Chaîne signée : `${timestamp}.${nonce}.${corps brut}` — identique côté plugin Java. */
export function signPayload(secret: string, timestamp: string, nonce: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function safeEqualString(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
