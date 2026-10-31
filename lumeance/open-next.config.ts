import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Configuration minimale : pas de cache incrémental distant (R2/KV) pour démarrer gratuitement.
// Les pages ISR sont régénérées à la demande. À enrichir (R2) si le trafic l'exige.
export default defineCloudflareConfig();
