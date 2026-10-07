# Sécurité

## En place (testé)

| Mesure | Où |
|---|---|
| HMAC-SHA256 + timestamp ±5 min + nonce unique sur le bridge | `apps/api/src/routes/bridge.ts`, tests `bridge.test.ts` |
| Comparaisons à temps constant (signatures, jeton admin) | `src/lib/hmac.ts` |
| Rotation des clés bridge (plusieurs clés simultanées) | `BRIDGE_KEYS` |
| Validation zod de toutes les entrées (corps, paramètres, requêtes) | toutes les routes |
| Rate limiting global et par route ; quotas par clé API publique | `@fastify/rate-limit` |
| Clés API publiques stockées hachées (SHA-256) | `api_keys` |
| Requêtes SQL paramétrées uniquement | postgres.js (templates) |
| Prix recalculés côté serveur, montant du webhook comparé à la commande | `services/orders.ts` |
| Paiement confirmé uniquement par webhook, jamais par le retour navigateur | architecture boutique |
| Idempotence financière et des récompenses | voir `DATABASE.md` |
| Journal d'audit des actions admin et des paiements | `audit_logs` |
| Secrets uniquement côté serveur ; client API marqué `server-only` | `apps/web/lib/api.ts`, `apps/admin/lib/api.ts` |
| Rendu Markdown sans HTML brut, liens limités à `/` et `https://` | `apps/web/lib/markdown.tsx`, tests |
| En-têtes : HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy | `apps/web/next.config.ts` |
| Admin : Basic Auth sur tout `/admin`, `noindex`, `no-store` | `apps/admin/middleware.ts` |
| Logs : en-têtes sensibles masqués (`authorization`, `x-api-key`, signature) | `src/app.ts` |
| `.env` ignorés par Git, fichiers `.env.example` sans secret | `.gitignore` |
| Statut, profils : un serveur silencieux n'affiche pas de joueurs fantômes | `routes/v1.ts` |

## À faire

- Content-Security-Policy stricte (nonces Next) sur le site.
- Remplacer la Basic Auth admin par sessions Discord + rôles (Phase 7) ; d'ici là, HTTPS obligatoire et mot de passe long.
- Vérification de signature du prestataire de paiement (Phase 14).
- Rate limiting partagé (Redis) dès qu'il y a plusieurs instances d'API.
- Sauvegarde chiffrée hors site + test de restauration périodique (procédure testée localement, voir `SCALABILITY.md`).
- Scan des dépendances en CI (`pnpm audit`, Dependabot).

## Signaler une faille

[À RENSEIGNER] — adresse dédiée. Ne pas ouvrir de ticket public.
