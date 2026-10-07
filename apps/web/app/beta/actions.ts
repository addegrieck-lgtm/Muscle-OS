"use server";

export type BetaState = { ok: boolean; message: string } | null;

export async function joinBeta(_prev: BetaState, form: FormData): Promise<BetaState> {
  const minecraftUsername = String(form.get("minecraftUsername") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const referralCode = String(form.get("referralCode") ?? "").trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftUsername)) return { ok: false, message: "Pseudo Minecraft invalide (3 à 16 caractères : lettres, chiffres, _)." };
  if (form.get("consent") !== "on") return { ok: false, message: "Merci d'accepter l'utilisation de tes données pour l'inscription." };
  try {
    const res = await fetch(`${process.env.API_URL ?? "http://localhost:4000"}/api/v1/beta`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minecraftUsername, email, referralCode, utmSource: String(form.get("utmSource") ?? "") || undefined, consent: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 201) return { ok: true, message: `C'est noté, ${minecraftUsername} ! Tu seras prévenu de l'ouverture.` };
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    return { ok: false, message: body?.error?.message ?? "Inscription impossible pour le moment." };
  } catch {
    return { ok: false, message: "Service momentanément indisponible, réessaie dans un instant." };
  }
}
