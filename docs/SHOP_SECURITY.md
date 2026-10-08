# Boutique — sécurité et anti-abus

| Risque | Protection | Où | Testé |
|---|---|---|---|
| Prix ou points modifiés dans le navigateur | Le panier ne contient que des ids + quantités ; prix, promos et points recalculés par l'API ; champs inconnus ignorés | `services/shop/catalog.ts` `quote()` | ✅ |
| Paiement « validé » côté client | Seul le webhook signé confirme ; la page de retour ne fait que lire | `routes/webhooks.ts` | ✅ |
| Webhook forgé | HMAC sur le corps brut, comparaison à temps constant | adaptateurs `stripe.ts`, `sandbox.ts` | ✅ |
| Rejeu d'un webhook | Fenêtre de 5 min + `payment_events` unique | | ✅ |
| Montant falsifié / devise | Comparaison stricte avec la commande | `handlePaymentSucceeded` | ✅ |
| Double paiement / double clic | Clé d'idempotence stable côté navigateur + unique en base ; Stripe `idempotency-key` | `createOrder` | ✅ |
| Double livraison | Clés uniques sur droits, livraisons, grades, ordres | `ledger.ts` | ✅ |
| Double crédit de points | Clé unique par article | `point_transactions` | ✅ |
| Usurpation d'un joueur | Achat lié à un compte (Discord) ; points consultables seulement après preuve `/link` en jeu ; UUID résolu côté serveur et figé | `identity.ts` | ✅ |
| Lecture d'une commande d'autrui | Commande visible par son acheteur uniquement | `GET /api/v1/shop/orders/:id` | ✅ |
| Prestataire de test ou connexion de dev en production | Refus au démarrage de l'API | `env.ts` | ✅ |
| Abus de débit | Rate limiting : devis 60/min, checkout 10/10 min, liaison 10/10 min, webhooks 300/min | routes | — |
| Vol de session | Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, jeton aléatoire 256 bits, seul le hash est stocké, expiration glissante 30 j | `lib/session.ts`, `identity.ts` | — |
| CSRF | Server actions Next (contrôle d'origine intégré), état OAuth en cookie, contrôle d'origine sur la déconnexion | `app/api/auth/*` | — |
| Redirection ouverte après connexion | `safeNext()` n'accepte qu'un chemin interne | `lib/session.ts` | — |
| Traçabilité | `audit_logs` : commande, paiement, montant incohérent, webhook rejeté, remboursement, grade, toute écriture admin | | ✅ |
| Données bancaires | Jamais reçues ni stockées | | — |

## Points d'attention restants

- Rate limiting en mémoire : à passer sur Redis dès qu'il y a plusieurs instances d'API.
- Admin : Basic Auth à remplacer par des comptes staff avec rôles.
- Content-Security-Policy stricte à ajouter sur le site.
- Anti-fraude prestataire (3-D Secure, Radar…) : à activer chez le prestataire choisi.
