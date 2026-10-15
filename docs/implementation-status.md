# État de réalisation

Ce document distingue le code disponible des intégrations réelles. Une fonctionnalité non listée comme terminée ne doit pas être considérée comme prête pour la production.

## Mise à jour globale selon le brief et les maquettes HTML (octobre 2026)

Référence : `PrestAfrik maquettes UX UI/PRESTAFRIK-BRIEF-CLAUDE-CODE.md`. Inventaire écran par écran : `docs/design/INVENTAIRE.md`. Décisions : `docs/decisions.md`.

### Terminé et vérifié (planche maquette / application, tests)

- Étape 0 : 53 écrans extraits (captures, textes, structures) dans `docs/design/reference/`.
- Authentification : connexion, inscription, mot de passe oublié et réinitialisation selon les maquettes ; mot de passe de 8 caractères minimum, icône œil seule, « Rester connecté 30 jours », mots de passe courants refusés, vouvoiement, limitation de débit.
- Shell vendeur (barre du haut, recherche, sélecteur de boutique, menu du compte, tiroir sous 1024 px, bandeau de vérification d'e-mail).
- Accueil vendeur : filtre de période (fuseau Africa/Douala), indicateurs calculés en SQL, « À faire aujourd’hui », checklist cochée automatiquement, fenêtre de partage (lien, QR code téléchargeable, WhatsApp).
- Commandes simplifiées (ADR-013) : trois statuts seulement (Nouvelle, Validée, Annulée), sans confirmation du client ni étapes de traitement. Sur chaque commande : « Continuer sur WhatsApp » (message prérempli au client), « Valider » (montant compté automatiquement dans Argent reçu, stock sorti) et « Voir » ; annulation possible depuis la commande (écriture inverse si elle était validée). Livraisons = zones à frais fixes, connus du client avant sa commande ; plus de frais « à confirmer », de livreurs ni de paiements partiels. Parcours testé : `node scripts/design/orders-flow.mjs <dossier>`.
- Catalogue : onglets Actifs/Brouillons/Archivés, actions groupées, dupliquer, archiver, suppression réservée aux produits jamais commandés, jusqu’à 5 photos (3 tailles, glisser-déposer, ordre, texte alternatif, limite en base), contrôle de concurrence, import CSV en 3 étapes avec rapport d’erreurs, export compatible.
- Clients, fiche client, Marketing (simulation affichée, confirmation explicite), Livraisons (zones à frais fixes), Argent reçu (commandes validées, annulations déduites).
- Assistant de création en 8 étapes (`/boutiques/nouvelle`) : boutique créée en brouillon dès l’étape 1 avec l’essai d’un mois, progression enregistrée (`Store.onboardingStep`), reprise depuis l’accueil, « Enregistrer et quitter », retour aux étapes validées, aperçu en direct. Adresse vérifiée en direct (anti-rebond 400 ms, limite 60/min, noms réservés, suggestions disponibles). Activités et villes dans une liste avec recherche accessible (clavier, feuille basse sur mobile, « pas dans la liste »). Cameroun : 10 régions et leurs villes (`src/config/geo/CM.json`), autres pays en saisie libre. Téléphone et WhatsApp séparés. Premier produit facultatif avec 5 photos. Publication via les conditions de publication, puis écran « Félicitations » (lien, copie, WhatsApp, QR code, réseaux sociaux). Parcours vérifié à 1280 et 390 px : `node scripts/design/wizard-walk.mjs <dossier> <largeur>`.
- Boutique publique, mobile d’abord : accueil (recherche, catégories, bandeau livraison calculé depuis les zones, grille), fiche produit (galerie à glisser, options en pastilles, quantité), panier, formulaire de commande (progression des champs, zone de livraison choisie dans la liste avec frais affichés, retrait, total exact avant de commander, « Commander » et « Commander sur WhatsApp » actifs seulement quand tout est rempli), résultat et suivi (`/boutique/[slug]/suivi/[token]`, anciens liens redirigés), assistant à réponses guidées avec transfert WhatsApp, pages éditoriales en blocs, 3 thèmes réels (Catalogue express, Mode et beauté, Boutique de marque). Le serveur recalcule le total ; si le prix a changé, la commande est refusée avec le nouveau total. Parcours testé : `node scripts/design/storefront-walk.mjs <dossier> 390`.
- Photos produit : correction du bug d’affichage (fichiers hors `public/`, servis par `/media`, remplacement au lieu d’ajout masqué, limite de 1 Mo des Server Actions relevée).

### Codé, à vérifier visuellement (la base locale a été arrêtée faute de mémoire)

- Ma boutique (logo carré, thèmes, couleurs avec lisibilité, informations, retrait, conditions de publication), Pages éditoriales en blocs, Confirmation WhatsApp (modèles et interrupteurs), configuration de l’API, Assistant WhatsApp.

### Reste à faire

- Équipe, Abonnement, Administration, landing page, 25 modèles d’e-mails, en-têtes de sécurité/CSP, worker et webhooks WhatsApp, tests Playwright de la matrice de viewports, CI.

## Étape 1 — initialisation, base, authentification et boutiques

### Code disponible

- Structure Next.js App Router, TypeScript strict, Tailwind CSS, Zod, Prisma et Better Auth.
- Logo fourni, tokens globaux et premières interfaces d’authentification.
- Inscription, connexion, déconnexion, récupération et réinitialisation du mot de passe.
- Création de boutique, sélection et vérification des rôles côté serveur.
- Seed protégé de cinq boutiques fictives et dix membres.

### Limites

- Les migrations sont appliquées sur la base PostgreSQL configurée dans l’environnement de développement ; Prisma confirme que son schéma correspond au modèle courant. Toute autre base doit appliquer `npm run db:deploy`.
- La boîte mail locale ne contacte aucun fournisseur ; l’envoi réel des e-mails nécessite une intégration.
- Le seed ne fournit pas de mots de passe de démonstration.
- L’invitation de collaborateurs dans l’interface et les limitations distribuées des tentatives restent à faire.

## Étape 2 — catalogue, boutique publique et apparence

### Code disponible

- CRUD des produits et variantes, catégories, archivage, filtres et pagination du catalogue vendeur.
- Import/export CSV avec échappement des cellules et validation des données.
- Téléversement de logo et d’images JPEG/PNG/WebP, conversion WebP et vérification des dimensions.
- Personnalisation des couleurs, aperçu, remise à zéro et publication/dépublication de boutique.
- Vitrine publique publiée, pages de catalogue et de produit, panier local par boutique.
- Aperçu privé des boutiques en brouillon, réservé aux membres connectés de la boutique et sans commande possible.
- Mise en page responsive des pages boutique/produits alignée sur les proportions des maquettes fournies.
- Cache de 60 secondes sur les lectures du catalogue public, invalidé après les modifications de boutique ou de catalogue ; les prix et le stock du checkout restent vérifiés directement côté serveur.
- Images de produits servies via l’optimiseur Next.js.
- Le serveur de développement écoute sur le réseau local ; Better Auth n’accepte que les origines loopback et IPv4 privées en développement pour les tests mobiles.

### Limites

- Les nouvelles pages n’ont pas encore été vérifiées contre toutes les maquettes ni ajustées pixel par pixel.
- Le stockage des images est local ; il faudra un stockage objet durable pour la production.
- Le catalogue public est limité à 100 produits et n’a pas encore de pagination.

## Étape 3 — panier, commande, CRM et stock

### Fondations disponibles

- Devis serveur signés à durée limitée ; le serveur revalide prix, stock, variantes et zone de livraison.
- Création transactionnelle d’une commande invitée avec clé d’idempotence, réservations de stock, consentements, événement et entrée de boîte d’envoi.
- Espace Messages protégé par les permissions commandes, avec historique des événements et simulation locale de 20 confirmations maximum par action ; seuls les clients ayant consenti au suivi sont simulés.
- Page de suivi par jeton aléatoire et impression du récapitulatif.
- Espace vendeur des commandes : liste filtrable et paginée, détail, historique, transitions de statut, permissions par rôle et gestion transactionnelle des réservations de stock.
- Tests unitaires des transitions d’état et des commandes terminales.
- Espace Livraison : états du parcours, affectation de livreurs par boutique, zones et frais de livraison, motifs d’échec et retraits.
- Espace Argent reçu : écritures d’encaissement, collecte par livreur, reversement, remboursement et écriture inverse immuable ; le statut de paiement est calculé depuis le journal et une livraison ne vaut pas encaissement.
- Indicateurs du tableau de bord calculés à partir des paiements réellement enregistrés.
- Migration additive `20261011072000_deliveries_and_payments` appliquée à la base PostgreSQL de développement ; tests unitaires des transitions de livraison, soldes livreur et statuts de paiement.
- CRM vendeur : liste paginée et filtrable, segments, export CSV respectant les filtres, fiches clients, création manuelle, tags, notes, rappels et consentements historisés.
- Déduplication client par boutique et numéro WhatsApp ; les conflits de nom sont signalés sans écraser automatiquement la fiche. Migration additive `20261011083000_customer_crm` appliquée à la base PostgreSQL de développement.
- Marketing vendeur : brouillons de campagnes par boutique, audiences CRM, limite de destinataires, historique et simulation uniquement. Les destinataires sont sélectionnés au dernier moment à partir du consentement marketing actif ; les rôles sans permission n’accèdent ni à la page ni aux actions.
- Migration additive `20261011090000_marketing_campaigns` appliquée à la base PostgreSQL de développement.
- Gestion d’équipe : consultation par le propriétaire et le gestionnaire ; invitations propriétaire uniquement, liens aléatoires à usage unique valables 7 jours, acceptation par le compte correspondant à l’e-mail invité, changement de rôle et retrait des membres non propriétaires. Les liens sont hashés en base ; les invitations sont envoyées par SMTP.
- La matrice des permissions affichée est calculée depuis la même fonction serveur que les contrôles d’accès ; retirer un membre supprime son appartenance immédiatement.
- Abonnements : offres Essentiel, Business et Pro, essai Business d’un mois calendaire, choix mensuel/annuel, quotas de produits, messages et membres, historique de démonstration, échéances et rappels visuels à 7, 3 et 1 jour.
- Interface Abonnement alignée sur la maquette PDF : bandeau d’essai, bascule mensuel/annuel, prix des deux périodes, quotas inclus dans les cartes, historique à quatre colonnes et Business mis en avant.
- SMTP transactionnel branché sur la vérification d’adresse, la récupération du mot de passe et les invitations ; la vérification d’adresse est obligatoire. La boîte de réception locale et son endpoint ont été retirés.
- Documents légaux de travail en français pour le contexte camerounais : mentions légales, conditions d’utilisation/abonnement, confidentialité et modèle de conditions de vente vendeur. Ils restent explicitement à compléter et à valider par un professionnel du droit avant publication.
- Modèle de configuration production `.env.production.example` et guide `docs/production-configuration.md` pour SMTP/IMAP, WhatsApp Cloud API, paiements, stockage et informations légales. Les adaptateurs WhatsApp, paiements et stockage ne sont pas implémentés.
- Quotas configurés : Essentiel 25 produits / 500 messages par mois / 2 membres ; Business 100 produits / 3 000 messages / 10 membres ; Pro produits illimités / 10 000 messages / 30 membres. Les volumes de messages restent à confirmer avant commercialisation.
- Migration additive `20261011140000_update_plan_quotas` appliquée à la base de développement : limite Pro illimitée représentée par une valeur nullable ; quotas des offres mis à jour sans modifier les abonnements ni les paiements existants.
- Les quotas bloquent côté serveur la création de produits, d’invitations, de campagnes et la simulation de messages ; le quota partagé des messages est sérialisé par abonnement. Après échéance, les produits/campagnes sont bloqués à 7 jours et la vitrine ainsi que les nouvelles commandes à 14 jours, tandis que les commandes existantes restent accessibles.
- Migration additive `20261011110000_subscriptions` appliquée à la base PostgreSQL de développement ; `prisma migrate status` confirme que le schéma est à jour.
- Vérifications statiques, lint, tests unitaires et build réussis après les changements catalogue/commande.

### Non terminé ou non validé

- Toute autre base doit exécuter `npm run db:deploy` avant d’ouvrir les écrans d’abonnement ou d’utiliser les quotas.
- **Pas prêt pour une mise en production publique sans intégrations et préparation opérationnelle** : l’e-mail transactionnel SMTP est disponible mais doit être validé sur l’hébergement avec un domaine expéditeur autorisé ; les abonnements n’ont pas de paiement réel ; les messages WhatsApp et campagnes sont en simulation ; les images sont écrites sur le disque local et nécessitent un stockage durable hors d’un serveur persistant ; les documents légaux doivent être renseignés et validés.
- En production, l’application refuse maintenant de démarrer si BETTER_AUTH_URL n’est pas une origine HTTPS valide et BETTER_AUTH_SECRET reste requis ; le fichier `.env.example` documente la forme de l’URL de production.
- Les pages légales, la configuration du domaine/DNS/TLS, le déploiement d’une base de production distincte, les sauvegardes/restaurations et un test bout en bout sur l’environnement de préproduction restent à réaliser.
- La création de commande et les nouveaux parcours Livraison/Paiement nécessitent encore un test de bout en bout avec un compte vendeur et PostgreSQL configuré.
- Toute autre base PostgreSQL doit appliquer `npm run db:deploy` pour disposer des tables de campagnes.
- Les invitations d’équipe utilisent les tables existantes ; aucun changement de schéma ou de migration n’est requis. Aucun fournisseur réel d’e-mail n’est configuré.
- Les zones sont encore gérées comme une ville et un nom de zone à la fois ; l’édition, la désactivation et l’affectation groupée de livreurs restent à faire.
- La liste des écritures affiche les 100 plus récentes de la période ; une pagination complète reste à faire.
- La simulation Messages ne constitue pas un envoi WhatsApp ; aucun fournisseur réel, worker automatique ni webhook n’est connecté.
- Aucun fournisseur réel de paiement, de livraison, d’abonnement ou de rappel par e-mail n’est configuré ; l’activation d’abonnement est une simulation locale interdite en production.
- Les pages du tableau de bord dépendent de PostgreSQL distant ; les temps serveur observés en développement ont varié d’environ 4,7 à 13,3 secondes selon le chargement, le profilage et l’optimisation globale restent à faire.

## WhatsApp — wa.me par défaut et API au choix

### Code disponible

- Page **Ma boutique → Connexion WhatsApp** (`/dashboard/boutique/whatsapp`), reprise de la maquette « Paramètres WhatsApp » sans le panneau de simulation : choix du mode, configuration wa.me, configuration API, quota du mois et confirmations récentes.
- Mode **wa.me** actif par défaut avec le numéro saisi à la création de la boutique : bouton « Commander via WhatsApp » sur les fiches produits (désactivable), bouton « Confirmer sur WhatsApp » sur la page de suivi, lien « Envoyer sur WhatsApp » pour chaque commande à confirmer côté vendeur.
- Fiche produit : « Commander maintenant » (panier puis formulaire) et « Commander via WhatsApp » ; l’ajout au panier reste disponible sous forme de lien.
- Mode **API** : identifiants stockés par boutique, jeton et secret chiffrés, activation refusée tant que Meta ne valide pas le numéro et le jeton ; bouton « Tester la connexion » et retrait de la configuration.
- Migration additive `20261014120000_whatsapp_settings` ; tests unitaires des numéros et messages wa.me.

### Limites

- Une commande passée via « Commander via WhatsApp » se poursuit dans la conversation : elle n’est pas enregistrée automatiquement dans PrestAfrik.
- En mode wa.me, PrestAfrik ne peut pas savoir si un message a été envoyé, livré ou lu ; le vendeur confirme la commande manuellement.
- En mode API, l’envoi automatique des confirmations, le worker et le webhook ne sont pas encore implémentés (étape 4).

## Étapes restantes

4. Fournisseur WhatsApp réel, worker automatique et webhooks ; la boîte d’envoi, son journal et le simulateur local sont disponibles.
5. Tests intégrés et complétion CRM, livraison, encaissements et tableau de bord.
6. Fournisseur de paiement d’abonnement et administration PrestAfrik ; les écrans, la migration et les quotas de démonstration sont disponibles, mais aucun paiement réel n’est connecté.
7. Intégration d’un fournisseur de messagerie marketing réel (le module campagne reste explicitement en mode simulation), partage et fonctionnalités sans IA.
8. Pages éditoriales/légales, tests complets sur PostgreSQL, audit de sécurité et déploiement.

## Vérifications récentes

- `npm run lint` : réussi après l’ajout du CRM.
- `npm run typecheck` : réussi après l’ajout du CRM.
- `npm test` : 16 tests réussis sur 5 fichiers, dont les tests de validation et segmentation CRM.
- `npm run test:e2e -- --workers=1` : 4 tests navigateur réussis sur l’authentification.
- `npm run build` : build de production réussi avec Poppins, Prisma Client, la route Messages et le simulateur inclus.
- `npm run typecheck`, `npm run lint` et `npm test` (22 tests sur 7 fichiers) réussis après les modules Marketing et Équipe.
- Le build de production inclut `/dashboard/equipe`, `/invitations/accepter` et `/dashboard/marketing`.
- `/dashboard/equipe` a été chargé avec la base de développement ; le formulaire propriétaire, la liste des membres et la matrice des permissions sont visibles. Aucun e-mail d’invitation de test n’a été envoyé.
- `/dashboard/marketing` et ses champs bordés ont été vérifiés sur ordinateur et mobile ; aucune barre de défilement horizontale à 390 px. La migration Marketing est appliquée à la base de développement et l’état Prisma est à jour.
- Abonnements : migration `20261011110000_subscriptions` appliquée ; `prisma migrate status` confirme que la base est à jour. Le client Prisma généré, la validation du schéma, le typecheck, le lint, les 27 tests et le build de production réussissent.
- Ajustement des quotas : migration `20261011140000_update_plan_quotas` appliquée et confirmée ; écran Abonnement vérifié dans le navigateur avec les quotas Essentiel (25/2), Business (100/10) et Pro (illimité/30).
- Les fonctions de calendrier ont des tests dédiés (fin de mois, année bissextile, début de mois UTC et pause exacte à 14 jours). La page Abonnement a été chargée sur la base de développement après migration.
- Vérification navigateur après migration : `/dashboard/marketing`, `/dashboard/messages`, `/dashboard/equipe`, `/dashboard/abonnement` et `/boutique/zalam` s’affichent ; la page Abonnement à 390 px ne déborde pas horizontalement.
- Le serveur de développement a été redémarré après la génération/build et répond en HTTP 200 sur `http://localhost:3000`.
- La page `/dashboard/clients` et l’accès au formulaire de création ont été vérifiés dans le navigateur ; l’état vide est attendu pour la boutique de test.
- Poppins est chargée depuis les fichiers locaux et vérifiée dans le navigateur.
- Un fichier de configuration généré de Next.js DevTools contenait du JSON invalide ; sa suppression a permis de régénérer une configuration valide, et les scénarios navigateur suivants n’ont plus produit l’avertissement.
- Ces vérifications ne remplacent pas un test d’intégration sur une base PostgreSQL configurée.
