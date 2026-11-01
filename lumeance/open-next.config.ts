// Adaptateur Cloudflare. Pas de cache de pages persistant : les pages de la boutique sont
// rendues à chaque requête (voir app/(store)/layout.tsx), aucun stockage R2 n'est nécessaire.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
