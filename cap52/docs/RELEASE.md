# Publication

Rien de ce qui suit n'est encore fait. Cette checklist sert à préparer la bêta (objectif : vers le 15 décembre 2026) puis la sortie.

## Checklist technique

- [ ] Identifiants de publication choisis (bundle iOS, package Android) et ajoutés à `app.json`
- [ ] Icône, icône adaptative Android, écran de démarrage aux couleurs de la marque
- [ ] `npm run check`, `npm run test:rls` et `npx expo-doctor` au vert
- [ ] Build de développement testé sur un iPhone réel et un Android réel (voir le plan de test plus bas)
- [ ] Build `preview` distribué aux testeurs (TestFlight, test interne Play)
- [ ] Supabase de production configuré (OTP, fonctions, secrets, purge planifiée)
- [ ] RevenueCat de production + produits approuvés dans les deux stores
- [ ] `supportEmail`, `privacyPolicyUrl` et `termsUrl` renseignés dans `src/config/app.ts`
- [ ] Version et numéro de build incrémentés (EAS `autoIncrement`)

## Plan de test sur appareil (décembre)

Onboarding complet et passé · les 3 modes · valider, compléter, saisir, modifier, retirer, annuler une semaine · ignorer et réactiver · mode libre : montant prévu · fermer et rouvrir l'app (persistance) · redémarrer le téléphone (rappel conservé) · refuser puis autoriser les notifications · changer jour et heure du rappel · changer de fuseau horaire · partager la carte avec et sans montant · exporter les données · tout effacer · thèmes (Premium simulé en build de développement) · police système agrandie au maximum · petit écran (iPhone SE, Android 5") · VoiceOver et TalkBack sur la grille · mode sombre et clair du système · achat, restauration, annulation et expiration en sandbox · connexion OTP, synchronisation sur deux appareils, suppression de compte · défis : créer, inviter, rejoindre, quitter · coach : réponse, quota, service indisponible.

## Confidentialité

- [ ] Politique de confidentialité publiée (URL publique) : données traitées (e-mail, challenges, versements déclarés, pseudo), finalités, base légale, durée de conservation, sous-traitants (Supabase, RevenueCat, fournisseur d'IA, Apple et Google), droits RGPD, contact
- [ ] Hébergement Supabase et transferts hors UE vérifiés (fournisseur d'IA notamment) et mentionnés
- [ ] Apple « App Privacy » : e-mail (lié à l'utilisateur, fonctionnalité de l'app), contenu utilisateur (challenges), achats ; aucun suivi
- [ ] Google « Data safety » : mêmes catégories, chiffrement en transit, suppression possible depuis l'app
- [ ] Suppression de compte accessible dans l'app (exigence Apple et Google) : présente (Profil → Compte)
- [ ] Lien de suppression de compte hors application pour Google Play : **à créer** (page web ou formulaire)
- [ ] Aucun SDK d'analyse tiers activé sans évaluation et consentement (voir Indicateurs)

## Abonnements

- [ ] Écran d'abonnement : prix, période, renouvellement automatique, résiliation, restauration (présents) ; liens vers les conditions et la politique de confidentialité (à renseigner)
- [ ] Conditions d'utilisation publiées (Apple exige un contrat de licence, l'EULA standard ou un contrat propre)
- [ ] Description de l'abonnement dans les fiches des stores
- [ ] Vérifier les règles en vigueur au moment de la soumission (paiement uniquement via les stores pour les biens numériques)

## Points réglementaires à faire valider

Cette liste ne vaut pas avis juridique : faire relire par un professionnel.

- Statut de l'application : outil de suivi déclaratif, sans conseil en investissement (le coach a des garde-fous, à faire relire)
- Droit de la consommation français et européen pour les abonnements (information précontractuelle, résiliation)
- Mentions légales de l'éditeur
- Disponibilité et protection de la marque « CAP 52 » (INPI, EUIPO, noms dans les stores)

## Indicateurs

`src/services/analytics.ts` déclare les événements (onboarding terminé, challenge créé, versement déclaré, partage, offre Premium consultée, abonnement démarré) avec un fournisseur **inactif**. Le retour la semaine suivante se déduit des versements déclarés.

Pour activer : choisir une solution respectueuse de la vie privée (auto-hébergée ou UE, sans identifiant publicitaire), évaluer le besoin de consentement, puis appeler `setAnalyticsProvider` au démarrage. Ne jamais envoyer de montants ni d'identifiants personnels.

## Retours bêta sans compte

« Profil → Donner mon avis » ouvre un e-mail vers `supportEmail` (à renseigner). TestFlight et Play proposent aussi leurs propres canaux de retour.

## Fiche des stores (brouillon)

- **Nom** : CAP 52 — Défi épargne 52 semaines *(30 caractères max sur l'App Store : à ajuster)*
- **Sous-titre** : Épargne un peu, chaque semaine
- **Description courte (Play)** : Le défi des 52 semaines : remplis ta grille, semaine après semaine.
- **Description longue** :

> Mettre de l'argent de côté, une semaine à la fois.
>
> CAP 52 transforme l'épargne en un défi simple et motivant : 1 € la première semaine, 2 € la deuxième… et 1 378 € au bout d'un an. Ou l'inverse. Ou à ton rythme.
>
> • Trois défis : classique, inversé ou libre
> • Une grille de 52 semaines qui se remplit à chaque versement
> • Un rappel par semaine, au moment de ton choix, jamais insistant
> • Tes progrès en un coup d'œil et une carte à partager
> • Sans compte, sans connexion bancaire : tes données restent sur ton téléphone
>
> Premium : plusieurs challenges, objectifs sur mesure, thèmes, statistiques avancées, défis entre amis et coach.
>
> CAP 52 ne détient pas ton argent et ne fait aucun virement : tu mets de côté où tu veux, et tu déclares tes versements dans l'application.

- **Mots-clés** : épargne, économiser, défi 52 semaines, budget, tirelire, objectif, argent de côté, challenge épargne
- **Captures** : accueil (anneau), grille, détail d'une semaine, statistiques, carte de partage
- **FAQ** : Est-ce que CAP 52 accède à mon compte bancaire ? Non. · Où va mon argent ? Là où tu choisis de le mettre : l'app enregistre seulement tes déclarations. · Puis-je rattraper une semaine ? Oui, à tout moment. · Que se passe-t-il si je résilie Premium ? Tes données restent, seule la création de nouveaux challenges premium est bloquée.

Ne pas utiliser de faux avis, de chiffres d'utilisateurs inventés ni de promesse de résultat financier.
