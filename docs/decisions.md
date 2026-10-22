# Décisions (ADR courts)

Chaque décision prise en l'absence d'instruction bloquante du brief (`PrestAfrik maquettes UX UI/PRESTAFRIK-BRIEF-CLAUDE-CODE.md`).

## ADR-001 — Conserver la stack en place (Next.js 16, Tailwind 4, Zod 4, Better Auth)

Le brief impose Next.js 15.5, Tailwind 3.4, Zod 3 et une authentification maison (bcrypt, `AuthToken`). Le dépôt utilise déjà Next.js 16.4, React 19.3, Tailwind 4.3, Zod 4.6, Prisma 6.12 et Better Auth 1.7, avec des fonctionnalités en production de développement. Revenir en arrière serait une régression (versions plus anciennes, réécriture de l'authentification et des sessions) sans bénéfice fonctionnel. Les exigences du brief sont appliquées sur cette base : 8 caractères minimum, sessions de 30 jours avec « Rester connecté », révocation des sessions à la réinitialisation, limitation de débit, liens de 60 minutes.

## ADR-002 — Routes de l'espace vendeur en `/dashboard/*`

Le brief propose `/app/[storeId]/…`. Le dépôt utilise `/dashboard/*` avec la boutique active mémorisée dans un cookie et **revérifiée côté serveur à chaque requête** (`getStoreContext`). Le `storeId` du navigateur n'est jamais cru. La correspondance maquette → route est tenue dans `docs/design/INVENTAIRE.md`.

## ADR-003 — Styles : tokens CSS + feuilles par domaine

Les écrans sont reconstruits avec des classes sémantiques (`src/styles/vendor.css`, `catalog.css`, `store.css`, `auth.css`) qui n'utilisent que les variables de `src/styles/tokens.css`. Tailwind reste disponible et relié aux mêmes variables (`@theme inline`). Aucune couleur hexadécimale dans les composants, sauf illustrations neutres documentées.

## ADR-004 — Polices auto-hébergées via @fontsource

Poppins (400 à 800) est servie depuis `node_modules/@fontsource/poppins`, sans appel à Google Fonts : même résultat que `next/font` (auto-hébergement), déjà en place et fonctionnel hors ligne.

## ADR-005 — Base PostgreSQL locale pour les tests et la revue visuelle

La base de `.env` (Supabase) contient de **vrais comptes**. Le seed refuse désormais toute base distante (sauf `ALLOW_REMOTE_DEMO_SEED=true`). Une base locale sans Docker est fournie par `embedded-postgres` : `node scripts/local-db.mjs` (port 54329, données dans `storage/postgres`).

## ADR-006 — Migration « sync_existing_schema » rendue idempotente

La migration initiale avait été réécrite avec le schéma complet : une base neuve échouait sur la deuxième migration (« type déjà existant »). Chaque instruction de `20261011053000_sync_existing_schema` ignore désormais les objets déjà présents. Les bases où elle était appliquée ne sont pas concernées (`migrate deploy` ne la rejoue pas). Vérifié : base neuve migrée sans erreur et sans dérive (`prisma migrate diff`).

## ADR-007 — Fichiers téléversés hors de `public/`

`next start` ne sert que les fichiers de `public/` présents au moment du build : les photos ajoutées ensuite n'apparaissaient pas. Les fichiers sont stockés dans `storage/uploads` (ou `UPLOADS_DIR`) et servis par `/media/[...path]` avec un chemin préfixé par la boutique et validé par expression régulière. Les anciennes adresses `/uploads/…` restent servies (réécriture). Depuis, `src/lib/storage.ts` bascule sur un stockage objet S3 compatible dès que `OBJECT_STORAGE_BUCKET` est défini (indispensable sur un disque éphémère) ; voir `docs/stockage-images.md`.

## ADR-008 — Photos produit : 3 tailles, fichiers provisoires puis rattachement

Chaque photo est envoyée seule (`POST /api/dashboard/produits/photos`, vérification d'origine, permission catalogue) et traitée par sharp : contenu vérifié, EXIF retiré, rotation, WebP 320/800/1600 px. Elle reste provisoire jusqu'à l'enregistrement du produit, qui la rattache et fixe l'ordre et le texte alternatif. La limite de 5 est appliquée dans l'interface, le service et la base (`CHECK position BETWEEN 0 AND 4`, `UNIQUE(productId, position)`).

## ADR-009 — État du produit et date d'encaissement

`Product.isArchived` est remplacé par `status` (`ACTIVE`, `DRAFT`, `ARCHIVED`) et `archivedAt`. `Payment.receivedAt` porte la date réelle de l'encaissement (jamais future) ; les statistiques par période l'utilisent.

## ADR-010 — Une livraison peut démarrer dès l'acceptation

La maquette « Livraison » montre une commande « Acceptée » en cours de livraison : les actions de livraison acceptent les commandes Acceptées, En préparation ou Terminées (plus seulement Terminées).

## ADR-011 — Variantes à une seule option

Le brief autorise 3 options ; le modèle existant porte une option par variante. L'éditeur gère une option (ex. Taille) et ses valeurs, chacune avec référence, prix et stock. L'extension à 3 options reste à faire.

## ADR-012 — Indicateur de solidité du mot de passe local

Plutôt que `@zxcvbn-ts/core`, un indicateur consultatif léger (longueur, variété, répétitions) et une liste locale de mots de passe courants (extrait ; la liste complète de 10 000 entrées pourra la remplacer sans changer l'interface).

## ADR-013 — Commandes simplifiées : Nouvelle → Validée ou Annulée

Décision du porteur de projet (15/10/2026) : les vendeurs apprennent seuls, l'application doit rester la plus simple possible. Cette décision prime sur le brief §6.6 (quatre axes de statut) et §6.8 (confirmation par le client).

- Plus de confirmation de la commande par le client (ni lien de suivi « Confirmer sur WhatsApp », ni statuts « à confirmer / modification demandée / refusée / expirée »).
- Plus d'étapes de traitement (accepter, préparer), de suivi de livraison ou de livreurs, ni de paiement « en attente » ou partiel.
- Les frais de livraison sont fixés par zone et connus du client avant la commande. Plus de frais « à confirmer » : sans zone correspondante, la livraison est refusée (le client choisit une zone ou le retrait).
- Chaque commande propose « Continuer sur WhatsApp » (message prérempli au client), « Valider » et « Voir ». Valider enregistre automatiquement le montant total dans « Argent reçu » et sort le stock. Annuler une commande validée crée une écriture inverse et remet les articles en stock.
- Schéma inchangé (aucune migration) : `processingStatus` porte l'état (TO_REVIEW = nouvelle, COMPLETED = validée, CANCELLED = annulée) ; les autres colonnes de statut restent en base pour l'historique. Les anciennes commandes « acceptées » ou « en préparation » apparaissent comme nouvelles.

## ADR-014 — Lancement gratuit : abonnements désactivés

Décision du porteur de projet (15/10/2026) : pendant le lancement, PrestAfrik est gratuit. Un seul interrupteur, `NEXT_PUBLIC_BILLING_ENABLED` (absent = gratuit), lu côté serveur et par le menu.

- Gratuit : aucune limite de produits, plafonds techniques larges pour les membres (50) et les messages (100 000 par mois), aucune expiration, restriction, rappel ni mise en pause de boutique ; l'abonnement n'est plus une condition de publication.
- Le menu « Abonnement » est grisé (« Gratuit ») et la page présente les offres à venir, désactivées.
- Les e-mails d'abonnement (E14 à E19, E23) restent écrits mais ne partent pas tant que l'interrupteur est désactivé.
- Pour activer les offres payantes plus tard : `NEXT_PUBLIC_BILLING_ENABLED=true`, sans migration.

## ADR-015 — E-mails : gabarits maison plutôt que react-email

Le document des modèles autorise `@react-email/components` ou MJML. Pour ne pas ajouter de dépendance, les 25 modèles utilisent une mise en page unique en tableaux HTML et styles en ligne (`src/modules/email/templates.ts`), avec une version texte générée à partir du même contenu. Les textes sont centralisés dans `src/config/texts/emails.ts`. Toute variable manquante fait échouer le rendu ; les adresses `.test` ne reçoivent jamais d'envoi réel ; aperçu en développement sur `/dev/emails`. Branchés : E01, E02, E04, E05, E09 à E13, E21. En attente de leur fonctionnalité : E03, E06 à E08, E20, E22, E24, E25 (et les e-mails d'abonnement).

## ADR-016 — Boutique créée à la fin de l'assistant, adresses à la racine

- **Brouillon** : l'assistant `/boutiques/nouvelle` n'écrit plus dans `Store` à l'étape 1. Ses réponses vont dans `StoreDraft` (migration `20261018090000_store_drafts`) ; la boutique, son abonnement d'essai, ses réglages WhatsApp et son premier produit sont créés en une transaction à la dernière étape, avec l'identifiant du brouillon (le logo et les photos envoyés pendant l'assistant restent valides). Si l'adresse e-mail n'est pas confirmée, la boutique est créée sans être publiée et le vendeur sait comment la confirmer.
- **Nom** : plusieurs boutiques peuvent porter le même nom, mais pas deux boutiques d'un même propriétaire (comparaison sans casse, accents ni espaces superflus) : contrôlé à l'étape 1, à la création et dans « Ma boutique ».
- **Adresses** : `prestafrik.com/{adresse}` (routes `src/app/[slug]`). Les anciens liens `/boutique/{adresse}/…` redirigent en 308 (`next.config.ts`). Les pages du site ont priorité sur les boutiques ; leurs noms sont réservés (`reservedSlugs`).
- **Suppression** : le propriétaire peut supprimer sa boutique (Ma boutique → Zone sensible), en retapant son nom ; paiements et commandes sont supprimés avant la boutique (relations `Restrict`), puis les images du stockage.

## ADR-017 — Administration PrestAfrik et photo de profil

- **Accès** : `/admin` est réservé au rôle plateforme `ADMIN`, relu en base à chaque requête (`requirePlatformAdmin`) ; un vendeur reçoit une page introuvable. Le rôle se donne avec `npm run admin:promote -- email` (ou `--retirer`).
- **Journal** : chaque action (suspension, prolongation d'essai, alerte, lien de réinitialisation, export) est écrite dans `AuditLog` et visible sur `/admin/journal`.
- **Suspension de boutique** : motif obligatoire, e-mail E20 au propriétaire, boutique masquée au public et commandes refusées (`suspendedAt`), bandeau dans l'espace vendeur, publication refusée.
- **Suspension de compte** : sessions supprimées et toute nouvelle session refusée (`databaseHooks.session.create`). Ni l'administrateur lui-même ni un autre administrateur ne peuvent être suspendus depuis l'écran.
- **Alertes** : calculées à partir des données (API WhatsApp en échec, ≥ 3 messages échoués en 24 h, ≥ 3 commandes sans réponse depuis 3 jours ; fin d'essai et quota à 90 % seulement si la facturation est active). Seule la décision (traitée / ignorée) est enregistrée (`AdminAlertState`), par clé journalière. Le « webhook silencieux » de la maquette attend l'implémentation des webhooks. « Tout marquer comme lu » devient « Tout marquer comme traité ».
- **Messages échoués** : seule la catégorie de l'erreur est affichée (jeton, modèle, numéro, autre) ; ni contenu, ni numéro, ni texte brut de l'erreur.
- **Nom du profil** : modifiable dans « Mon profil » (2 à 80 caractères, espaces superflus retirés, même règle qu'à l'inscription) ; il est mis à jour partout (menu du compte, équipe, administration).
- **Photo de profil** : `User.image`, recadrée en carré 512 px WebP, stockée sous `users/{userId}/{uuid}.webp` (servie par `/media`), ancienne photo supprimée après remplacement.

## ADR-018 — Pages publiques, boutiques hors ligne et favicon par boutique

- **Pages du site** : `/fonctionnalites`, `/a-propos`, `/demo`, `/blog` (+ `/blog/{article}`) et `/contact`, sur le gabarit `PageShell` (héros compact, appel final, pied de page) et les blocs de `src/components/landing/blocks.tsx`, avec les jetons de la landing (`src/styles/site-pages.css`). La navigation pointe vers ces pages.
- **Blog** : articles dans `src/components/landing/blog-posts.ts` (blocs typés) ; ajouter un objet suffit à publier. Pas de statistiques inventées : les chiffres sont des exemples de calcul et les citations sont signalées comme illustratives.
- **Contact** : action serveur avec validation, champ piège anti-robots et 5 messages / 15 min par IP ; message texte à `CONTACT_INBOX` (sinon `contact@prestafrik.com`, « Répondre » écrit à l'expéditeur) et accusé de réception E24.
- **Boutique hors ligne** : une adresse de boutique existante mais non publiée (ou suspendue) affiche « Bientôt en ligne » (ou « temporairement indisponible ») au lieu d'un 404, sans indexation. Cause des 404 signalés : boutiques créées sans produit actif, condition de publication non remplie.
- **Favicon** : les icônes PrestAfrik ne sont plus des fichiers de `src/app` (prioritaires sur `generateMetadata`) mais déclarées dans le layout racine ; une boutique avec logo le remplace par `/api/boutique/{adresse}/icone` (PNG 32/180/192/512, adresse versionnée par le logo).
- **Logos partenaires** : 8 logos fictifs (`public/landing/logos/`), à remplacer par ceux de vraies boutiques avec leur accord.
- **Mise à jour** : Fonctionnalités, À propos et Démo sont désactivées en attendant leurs maquettes (`disabledPages` dans `src/components/landing/content.ts` : page introuvable ; leurs liens restent dans le menu et le pied de page mais mènent à l'accueil ; code conservé). Seuls Blog et Contact sont en ligne. « Voir la démo » ouvre la vidéo de `demoVideo.url` (YouTube, Vimeo, .mp4/.webm) dans une fenêtre ; sans lien, il fait défiler jusqu'à la démo sur téléphone de l'accueil.
