# Boutique — avancement

Légende : 🟢 terminé · 🟡 en cours · 🔴 à faire · ⚪ non commencé. « Terminé » = vérifié par un test automatisé ou une exécution réelle décrite ici.

| # | Phase | Statut | Détail |
|---|---|---|---|
| 1 | Architecture boutique | 🟢 | Audit + plan : `SHOP_ARCHITECTURE.md` |
| 2 | Base de données | 🟢 | `002_shop.sql` ; migration des données existantes vérifiée sur la base de dev |
| 3 | Catalogue | 🟢 | API catalogue / produit / devis ; 21 produits d'exemple (`shopSeed.ts`), modifiables dans l'admin |
| 4 | Page boutique | 🟢 | `/boutique`, `/boutique/[catégorie]`, `/boutique/produit/[slug]`, progression, promotions, réassurance |
| 5 | Panier | 🟢 | Local (ids + quantités), ajout / retrait / quantités / total / points, mobile |
| 6 | Compte joueur | 🟢 | `/compte` (UUID, grade, points, progression, commandes), `/compte/points`, liaison `/link` |
| 7 | Points | 🟢 | Grand livre idempotent ; solde = somme du grand livre |
| 8 | Grades | 🟢 | Seuils en base, déblocage auto (ordre croissant), grade acheté = même mécanisme, « à examiner » après remboursement |
| 9 | Checkout | 🟢 | 5 étapes : pseudo → compte → résumé (devis serveur, CGV) → paiement → confirmation |
| 10 | Paiement | 🟡 | Interface prestataire + Stripe (signature testée, création de session non testée sans clé) + sandbox ; **prestataire réel à choisir** |
| 11 | Webhooks | 🟢 | Signature, fraîcheur, dédoublonnage, montant, remboursements |
| 12 | Livraison Minecraft | 🟡 | API + plugin (actions typées, `/link`) compilés et testés ; **plugin pas encore testé sur un vrai serveur Paper** ; commandes d'exemple à adapter aux plugins installés |
| 13 | Administration | 🟢 | `/admin/shop` : tableau de bord, produits (éditeur de livraisons), catégories, promotions, grades, commandes, livraisons, remboursement, ajustement de points |
| 14 | Sécurité | 🟢 | Voir `SHOP_SECURITY.md` (restes : Redis pour le rate limiting multi-instance, CSP, comptes staff) |
| 15 | Tests | 🟢 | Voir ci-dessous |
| 16 | Optimisation | 🟡 | Pages boutique en ISR 30 s (CDN), progression chargée à part, ~110 kB JS ; Lighthouse sur la version déployée à faire |

## Tests exécutés

| Suite | Résultat |
|---|---|
| API (PostgreSQL réel) : boutique, prix, commandes, bridge, public | **70 / 70** ✅ |
| — dont moteur de prix et grades (unitaires) | 13 ✅ |
| — dont parcours HTTP complet (`shop.test.ts`) : catalogue, devis falsifié, checkout sans compte, pseudo inconnu, rien crédité avant webhook, commande visible par son seul acheteur, webhook forgé / trop ancien, rejeu, grades multiples dans l'ordre, grade acheté non dupliqué, invariant du grand livre, ordres typés → DELIVERED, liaison `/link` + historique, remboursement total (points, livraisons annulées, grade « à examiner »), seuil modifié par l'admin, produit points ≠ prix, promotion bonus, tableau de bord, Stripe (signature valide / fausse / corps modifié / rejeu), refus du sandbox en production | 25 ✅ |
| Site (Markdown, guides) | 4 / 4 ✅ |
| Plugin Java (`gradle build`) + appel réel `/link` signé en Java | ✅ |
| Typecheck de tout le workspace ; builds site, admin, API ; export statique de l'aperçu (avec et sans API) | ✅ |
| **Parcours navigateur iPhone** : connexion → produit → panier (quantité modifiée) → checkout → page du prestataire de test → webhook → « Commande confirmée +55 points » → 71 ordres exécutés par un plugin simulé → « Tout a été livré en jeu » | ✅ |
| Navigateur : liaison `/link` sur `/compte`, historique des points (105 = 110 − 5 remboursés au prorata), carte « VÆLORIAN débloqué » sur `/boutique` | ✅ |
| Navigateur admin : 9 écrans, création d'un produit 20 € / 15 points, seuil Guerrier 15 → 20 relu par l'API, remboursement partiel | ✅ |
| Export aperçu servi sous `/Muscle-OS` : 3 explorations complètes, 66 pages, 0 lien cassé, 0 erreur JS | ✅ |

## Bugs trouvés et corrigés pendant les tests

- La recherche de joueurs de l'admin ignorait les joueurs créés par un achat (jamais connectés) → corrigée + test.
- La page du prestataire de test refusait les formulaires HTML (415) → corrigée + test au format navigateur.
- Libellés des étapes du checkout et des paliers de grade qui se chevauchaient sur iPhone → corrigés.
- Pages d'articles absentes de l'aperçu statique (liens cassés) → désormais pré-générées.

## Décisions attendues

1. Prestataire de paiement (Stripe, PayPal, Tebex…).
2. Plugins réellement utilisés (grades, spawners, kits) pour adapter les commandes d'exemple.
3. Prix, points, contenus des kits et seuils définitifs (tout se change dans l'admin).
4. Application Discord (identifiant + secret) pour activer la connexion.
5. Validation juridique des CGV (renonciation au droit de rétractation pour contenu numérique).
