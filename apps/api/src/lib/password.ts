import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** Mots de passe : scrypt (N=2^14, r=8, p=1), sel aléatoire, format « scrypt$N$r$p$sel$hash ». */
const N = 16384, R = 8, P = 1, LEN = 64;

const scrypt = (pw: string, salt: Buffer, opts: ScryptOptions) =>
  new Promise<Buffer>((res, rej) => scryptCb(pw.normalize("NFKC"), salt, LEN, { ...opts, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(pw, Buffer.from(salt, "base64url"), { N: Number(n), r: Number(r), p: Number(p) });
  const expected = Buffer.from(hash, "base64url");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash factice : un e-mail inconnu coûte le même temps qu'un mauvais mot de passe. */
export const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);

/** Règle minimale : 10 caractères, pas un mot de passe trivial. */
export function passwordProblem(pw: string, email: string): string | null {
  if (pw.length < 10) return "Mot de passe : 10 caractères minimum.";
  if (pw.length > 200) return "Mot de passe trop long.";
  if (/^(.)\1+$/.test(pw) || /^(0123456789|1234567890|azertyuiop|motdepasse|password)/i.test(pw)) return "Ce mot de passe est trop simple.";
  if (pw.toLowerCase().includes(email.split("@")[0]!.toLowerCase()) && email.split("@")[0]!.length >= 4) return "Le mot de passe ne doit pas contenir ton adresse e-mail.";
  return null;
}
