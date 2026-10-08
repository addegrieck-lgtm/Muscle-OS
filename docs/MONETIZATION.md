# Monétisation

> La boutique complète (points, grades, livraison, admin) est documentée dans `SHOP_ARCHITECTURE.md` et les fichiers `SHOP_*.md`.

## Règles

- **Aucun avantage de combat vendu.** Cosmétiques, tags, effets, pets, grades de confort, packs.
- Caisses aléatoires (crates) : **pas au lancement**. À n'envisager qu'après vérification des règles de Mojang (Minecraft Usage Guidelines/EULA, qui encadrent strictement les ventes sur serveurs) et de la réglementation française sur les jeux d'argent ; le cas échéant, probabilités affichées.
- Les mineurs doivent avoir l'accord parental (CGV).

## Architecture

```
PRODUCT ─► ORDER (VAL-AAAA-NNNNNN, idempotency_key) ─► ORDER_ITEMS
                │
   webhook prestataire (signé) ─► PAYMENT_WEBHOOK_EVENTS (dédup)
                │
                ▼
          PAYMENTS ─► TRANSACTIONS (grand livre : charge / refund / chargeback)
                │
                ▼
          ENTITLEMENTS (1 par unité achetée)
                │
                ▼
          MINECRAFT_COMMANDS ─► plugin ─► DELIVERED
                │
          AUDIT_LOGS à chaque étape
```

- Numéro de commande lisible et séquentiel par année via `order_counters` (transactionnel, sans trou en cas de concurrence).
- `handlePaymentSucceeded()` : dédoublonne l'événement, vérifie montant et devise, enregistre paiement + transaction, passe la commande `paid`, puis `fulfillOrder()` (rejouable sans doublon).
- Remboursement / rétrofacturation (à implémenter avec le prestataire) : ligne `refunds` + transaction négative + `entitlements.status = 'revoked'` + commande Minecraft inverse.

Testé : `apps/api/test/orders.test.ts` (numérotation, idempotence de création, webhook en double, montant incorrect, livraison refusée si non payée).

## Prestataire de paiement (Phase 14 — non démarrée)

Critères : webhooks signés, PayPal + carte, frais faibles sur petits montants, gestion de la TVA UE (un *merchant of record* simplifie la TVA mais coûte plus cher). Candidats : Stripe, PayPal, Tebex (spécialisé Minecraft, gère la conformité Mojang mais prend une commission plus élevée). **Décision à prendre par le propriétaire.** L'adaptateur n'aura qu'à vérifier la signature puis appeler `handlePaymentSucceeded()`.

## Autres sources prévues

- Parrainage (`referral_codes`, `referrals`) : récompense seulement après qualification (temps de jeu minimum, compte non lié à la même IP/Discord que le parrain, plafond par parrain) — anti-comptes secondaires.
- Programme créateurs : codes `kind = 'creator'`, mesurés par les UTM et les inscriptions bêta ; pas de tableau de bord créateur avant d'avoir des créateurs.
