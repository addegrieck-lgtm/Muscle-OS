/**
 * Vérification « J'ai voté » auprès des sites de classement : chaque site expose une adresse
 * qui répond si l'IP donnée a voté récemment pour le serveur. Formats repris des intégrations
 * publiques de ces sites (plugin Vote d'Azuriom) ; un changement côté site se corrige ici.
 */
export const VERIFIERS = ["serveur-prive.net", "serveur-minecraft.com", "liste-serveurs-minecraft.org"] as const;
export type VerifierId = (typeof VERIFIERS)[number];

export type VoteFetch = (url: string, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

const enc = encodeURIComponent;

const SPECS: Record<VerifierId, { url: (key: string, ip: string) => string; voted: (body: string) => boolean }> = {
  // { "success": true } si l'IP a voté (clé = jeton API de la fiche serveur)
  "serveur-prive.net": {
    url: (key, ip) => `https://serveur-prive.net/api/v1/servers/${enc(key)}/votes/${enc(ip)}`,
    voted: (b) => json(b)?.success === true,
  },
  // { "vote": 1 } si l'IP a voté (clé = identifiant numérique du serveur)
  "serveur-minecraft.com": {
    url: (key, ip) => `https://serveur-minecraft.com/api/1/vote/${enc(key)}/${enc(ip)}/json`,
    voted: (b) => String(json(b)?.vote) === "1",
  },
  // « 1 » si l'IP a voté dans les `duration` dernières minutes (clé = server_id)
  "liste-serveurs-minecraft.org": {
    url: (key, ip) => `https://api.liste-serveurs-minecraft.org/vote/vote_verification.php?server_id=${enc(key)}&ip=${enc(ip)}&duration=5`,
    voted: (b) => b.trim() === "1",
  },
};

function json(body: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(body);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export class VerifierUnavailable extends Error {}

/** true = vote trouvé, false = aucun vote récent. Lève VerifierUnavailable si le site ne répond pas. */
export async function hasVoted(fetcher: VoteFetch, verifier: VerifierId, key: string, ip: string): Promise<boolean> {
  const spec = SPECS[verifier];
  let res;
  try {
    res = await fetcher(spec.url(key, ip), { signal: AbortSignal.timeout(6000), headers: { accept: "application/json, text/plain", "user-agent": "VAELORIA-vote-check/1.0" } });
  } catch {
    throw new VerifierUnavailable(`${verifier} ne répond pas`);
  }
  // Certains sites répondent 404 quand aucun vote n'est trouvé : ce n'est pas une panne.
  if (res.status >= 500) throw new VerifierUnavailable(`${verifier} : HTTP ${res.status}`);
  return spec.voted(await res.text().catch(() => ""));
}
