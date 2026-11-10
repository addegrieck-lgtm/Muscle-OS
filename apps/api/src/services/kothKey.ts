/**
 * Clé de zone de carte (`map_zones.key`) d'un KOTH reçu par le bridge.
 *
 * VaeloriaFactions 1.3.0 envoie le libellé affiché (« KOTH gouffre », « Totem rubis ») ; les versions suivantes
 * envoient le nom seul (« gouffre »). On retire le préfixe KOTH / Totem, les accents et la casse, puis on
 * garde le format des clés de zone (a-z, 0-9, tirets). Renvoie null si rien d'exploitable ne reste.
 */
export function kothZoneKey(raw: string): string | null {
  const key = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .trim()
    .replace(/^(koth|totem)\b[\s:—-]*/u, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return /^[a-z0-9-]{2,40}$/.test(key) ? key : null;
}
