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

## ADR-019 — Avis clients, produits similaires et finitions de la boutique publique

- **Avis** : table `ProductReview` (note 1 à 5 contrôlée en base, prénom, commentaire, statut `PENDING` / `APPROVED` / `REJECTED`) et interrupteur `Store.reviewsEnabled` (activé par défaut). Un visiteur laisse un avis sans compte (champ piège, 3 avis / 10 min par IP) ; il n'est affiché qu'après validation par le vendeur dans **Avis clients** (`/dashboard/avis`, permission `products.manage`) : publier, refuser, retirer, supprimer, activer ou désactiver les avis. Désactivés : ni étoiles ni avis sur la boutique, avis conservés.
- **Affichage** : étoiles (remplissage partiel) et note sous le nom du produit ; sur chaque carte du catalogue, une ligne d'étoiles puis le nombre d'avis. Synthèses mises en cache 60 s, invalidées à chaque modération.
- **Produits similaires** : même catégorie d'abord, complétés par le reste du catalogue (4 au plus).
- **Fiche produit** : bouton d'agrandissement (visionneuse plein écran, flèches, touches ← → et Échap).
- **Commande** : erreurs affichées sous chaque champ dès qu'il est quitté ; boutons actifs seulement quand tout est valide ; barre des boutons dans le flux (non fixée).
- **Boutique** : fond de l'espace vendeur, pied de page séparé (espace, filet, fond blanc de l'en-tête), « Powered by PrestAfrik » vers la landing.
- **Mise à jour** : les avis sont publiés dès leur dépôt (le vendeur peut les retirer, les republier ou les supprimer ; « En attente » ne concerne plus que d'anciens avis). Un clic sur la photo du produit ouvre la visionneuse (plus de bouton dédié).

## ADR-020 — Couleurs tirées du logo, thème « Galerie » et adresse qui suit le nom

- **Pipette** : quand un logo est choisi (assistant, Ma boutique), les trois couleurs en sont tirées dans le navigateur (`src/lib/logo-palette.ts`) : principale = couleur vive dominante, secondaire = couleur foncée du logo (sinon version foncée de la principale), accent = autre teinte vive ; principale et secondaire sont assombries jusqu'à être lisibles (WCAG 4,5:1). Modifiables ensuite ; « Reprendre les couleurs de mon logo » remplace « Retour aux couleurs par défaut ».
- **Thème « Galerie »** (valeur `BOUTIQUE_MARQUE` conservée, aucune migration) : plus de bannière (supprimée pour tous les thèmes), aucun coin arrondi, deux produits par ligne bord à bord sur mobile et ordinateur, recherche par une loupe placée avant le panier.
- **Adresse** : changer le nom dans Ma boutique met à jour l'adresse (`slugify` du nom). Si elle est prise par une autre boutique ou réservée, on ajoute « -» et un identifiant court (6 caractères sans ambiguïté) et le vendeur en est clairement informé. Le nom n'est jamais modifié. L'ancienne adresse est gardée dans `StoreSlugAlias` et redirige (308) vers l'adresse actuelle ; une adresse gardée pour une boutique n'est pas attribuée à une autre.

## ADR-021 — Assistant : e-mail confirmé d'abord, étape « Livraison », marque PrestAfrik réservée

- **E-mail confirmé avant toute création** : tant que l'adresse du compte n'est pas confirmée, `/boutiques/nouvelle` affiche « Confirmez votre adresse e-mail » (consulter sa boîte, renvoyer l'e-mail, « J'ai confirmé mon adresse »). Les actions de l'assistant l'exigent aussi côté serveur (`requireVerifiedWizardSession`). Le lien de l'e-mail ramène à l'assistant. La dernière étape ne mentionne plus l'e-mail.
- **Étape 8 « Livraison et retrait » (facultative)** : jusqu'à 20 zones à frais fixes (nom, frais en FCFA, délai) dans la ville de la boutique, et retrait en boutique (activé par défaut, adresse préremplie avec le quartier et la ville, horaires facultatifs). Créés avec la boutique ; modifiables ensuite dans « Livraisons » et « Ma boutique ». La publication devient l'étape 9.
- **Marque réservée** : un nom contenant « PrestAfrik » (quelle que soit l'écriture) ou une adresse contenant « prestafrik » est refusé à tous sauf à l'administrateur de la plateforme (assistant, vérification en direct, renommage dans Ma boutique) ; l'administrateur peut prendre l'adresse `prestafrik`.
- **Adresses gardées en redirection** : l'assistant les considère désormais comme prises (`isSlugTaken`), comme le renommage.

## ADR-022 — Mise à jour de sécurité des dépendances (23/10/2026)

- **Next.js 16.4.0 → 16.4.2** : corrige une exécution de code à distance sans authentification dans l'optimiseur d'images (fichiers SVG) et un déni de service via les Server Actions (avis critiques).
- **`npm audit fix`** (sans `--force`, versions compatibles) : cloudinary 2.11 (injection d'arguments), SDK AWS 3.11xx (fast-xml-parser, critique), uuid. `npm audit` : 0 vulnérabilité.
- Vérifié : build de production complet, lint, typecheck, 130 tests, parcours public, vendeur, administration, optimiseur d'images et Server Actions sur la base de démonstration.

## ADR-023 — Page Démo selon la maquette « Démo.svg »

- `/demo` réactivée : héros « Découvrez PrestAfrik en vidéo », grand lecteur (67 % de la largeur, cadre blanc) qui chevauche le héros, onglets « Choisissez ce que vous voulez apprendre », témoignages et logos partenaires (composants de l'accueil réutilisés).
- Vidéos dans `demoPage.videos` (`src/components/landing/content.ts`) : un lien YouTube, Vimeo ou .mp4 par onglet, image d'attente facultative (sinon miniature YouTube). La vidéo se lit dans le cadre (youtube-nocookie). Onglet sans lien : « Vidéo bientôt disponible ». Changer d'onglet arrête la lecture ; flèches ← → entre onglets.
- « Voir la démo » de l'accueil mène à `/demo`.

## ADR-024 — Boutiques en sous-domaine (mboa-style.prestafrik.com)

- **Activation** : `FEATURE_SUBDOMAINS=true`, `STORE_ROOT_DOMAIN=prestafrik.com`, `STORE_PROXY_SECRET`. Désactivé, rien ne change. Activé, l'adresse partagée (assistant, Ma boutique, QR code, fiche produit) devient `https://{adresse}.prestafrik.com` ; `prestafrik.com/{adresse}` reste valide.
- **Routage** : `src/proxy.ts` réécrit `{adresse}.prestafrik.com/{chemin}` en `/{adresse}/{chemin}` (fichiers `_next`, `api`, `media` exclus). L'hôte vient de l'en-tête Host ou, derrière Cloudflare, de `x-prestafrik-store-host`, accepté seulement avec la clé `x-prestafrik-proxy-key`. Sous-domaines réservés (www, mail, admin…) ignorés.
- **Liens** : la vitrine construit ses liens avec `storeHref(base, …)` ; `base` vaut « » en sous-domaine et « /adresse » sinon (`storeBasePath` côté serveur, `useStoreHref` côté client). Pages légales et « Powered by » pointent vers le domaine principal.
- **Hébergement Hostinger** : ni joker DNS servi ni certificat joker sur l'offre Node.js, et la réécriture de Host par règle Cloudflare est réservée à Enterprise : DNS chez Cloudflare (certificat universel `*.prestafrik.com`) et Worker `infra/cloudflare/worker-sous-domaines.js`. Les fichiers du build sont servis depuis le domaine principal (`assetPrefix`, CORS) pour ménager le quota du Worker. Server Actions autorisées depuis `*.prestafrik.com` (`allowedOrigins`).
- **Panier** : il est propre à chaque adresse (stockage du navigateur) ; un panier commencé sur `prestafrik.com/{adresse}` n'apparaît pas sur le sous-domaine.
- Guide pas à pas : `docs/sous-domaines.md`.

## ADR-025 — Accueil de la boutique : bannière, promotions, mis en avant, mieux notés, menu, popup

- **Noms** : le cahier des charges proposait `ShopBanner`/`shopId` ; le dépôt parle de `Store` partout, d'où `StoreBanner`, `StorePopup` et l'énumération commune `StoreLinkType` (NONE, CATEGORY, PRODUCT, PROMO). Migration `20261025090000_store_banners_popups_page_order`.
- **Lien supprimé** : la clé étrangère remet la catégorie ou le produit à NULL, et un déclencheur PostgreSQL (`store_link_reset`) repasse alors le lien à « Aucun ». Un produit archivé ou épuisé rend aussi l'image non cliquable (contrôle à l'affichage) plutôt que de mener à une page introuvable.
- **Bannière** : 4 images au maximum, vérifié par le serveur (et revérifié dans la transaction) et par une contrainte `position BETWEEN 0 AND 3`. L'image est réduite dans le navigateur (photos de téléphone de 4 à 10 Mo) puis recadrée au centre en 1920×1080 WebP par le serveur : l'aperçu 16/9 du tableau de bord montre exactement le résultat. Texte alternatif par défaut : « {boutique} : image n de la bannière ». Ordre : glisser-déposer sur ordinateur, flèches monter/descendre partout (mobile et clavier). Onglet « Bannière » dans Ma boutique.
- **Accueil** : bannière, promotions, « Nos produits mis en avant », « Les mieux notés » puis « Tous nos produits » (le catalogue existant, gardé pour ne rien perdre). Pendant une recherche ou dans une catégorie, seules les catégories et les résultats s'affichent.
- **Promotions** : prix promo inférieur au prix normal. Le produit n'a pas de période de validité de promotion aujourd'hui : aucune n'a été ajoutée (le cahier des charges dit « si elle existe »). Tri par réduction décroissante, rangée de 7 cartes portrait (4/5) puis carte « Voir toutes les promotions » si plus de 7. Page `/{boutique}/promotions` paginée par 12. L'adresse produit « promotions » (et panier, commande, suivi, page) est désormais réservée.
- **Pagination** : `?featured=2` et `?top=3`, indépendantes, 12 par page. « Les mieux notés » n'apparaît que si la boutique accepte les avis.
- **Menu** : affiché seulement si au moins une page est publiée ; « Boutique » toujours en premier. « Activer » une page = la publier (le statut existant) ; nouvel ordre `StorePage.position` réglé par flèches dans Pages.
- **Popups** : onglets Campagnes / Popups dans Marketing (droit « marketing.manage »). Activer un popup désactive les autres, avec un message. Dates de début et de fin au jour près, à l'heure de Douala. Image recadrée en 1080×1350. Affiché 1 s après l'ouverture, une fois par visite (`sessionStorage`, clé par boutique et par popup : un nouveau popup se montre même si l'ancien a été vu).
- **Boutons-icônes** : importer et exporter (produits, commandes, clients) deviennent des icônes sur une même ligne, avec nom accessible et info-bulle.
- **Tests de bout en bout** : `tests/e2e/storefront-home.spec.ts` sur la base de démonstration (seed). Le seed ajoute 4 produits, 9 promotions, 14 produits mis en avant et notés, 3 images de bannière, un popup et deux pages à « Mboa Style ».

## ADR-026 — Dernière boutique utilisée et nouveau tableau de bord du vendeur

- **Dernière boutique** : `User.lastActiveStoreId` (migration `20261025120000_last_active_store_and_store_visits`), mis à jour à chaque changement de boutique (`rememberActiveStore`) et quand la boutique retenue n'est plus accessible (première boutique disponible). Le cookie vaut désormais « {boutique}:{session} » : pendant une même connexion, chaque appareil garde son choix ; à une nouvelle connexion (session différente), on reprend la dernière boutique du compte, quel que soit l'appareil. Les anciens cookies (sans session) sont ignorés une fois.
- **Périodes** : 7 jours, 30 jours, 3 mois glissants jusqu'à aujourd'hui (heure de Douala), comparés à la période précédente de même durée. Sur 3 mois, courbes et histogrammes par semaine.
- **Chiffres clés** : Commandes (reçues sur la période), Argent encaissé (même règle que « Argent reçu » : paiements enregistrés moins annulations), Commandes en attente de confirmation (valeur actuelle, sans évolution : elle ne dépend pas de la période), Visites, Panier moyen (commandes non annulées).
- **Statuts** : le cahier des charges citait « en attente, confirmée, livrée, annulée » ; l'application n'a que trois étapes (ADR-013) : Nouvelle, Validée (payée), Annulée. La répartition suit ces trois étapes.
- **Visites** : `StoreVisitDay` (boutique, jour, total), sans aucune donnée sur le visiteur. La vitrine envoie un signal une fois par visite (`sessionStorage`) ; ne sont pas comptés : robots évidents (agent utilisateur), membres de la boutique connectés, plus de 30 visites par heure depuis une même adresse IP.
- **Graphiques** : composants SVG maison (aucune nouvelle dépendance), une seule série par graphique (donc sans légende), info-bulle au survol et au clavier, tableau des chiffres sous chaque graphique. Couleur des tracés `#D97A00` (orange PrestAfrik foncé) : `#FF9900` n'atteint pas le contraste 3:1 sur le blanc pour un trait fin.
- **Mieux notés** : top 5 (note moyenne, puis nombre d'avis). **Dernières commandes** : les 5 dernières, avec accès direct.
- **Seed** : 90 jours de visites par boutique ; vendeur1 gère aussi « Douala Maison ». Tests : `tests/dashboard-periods.test.ts`, `tests/e2e/vendor-dashboard.spec.ts`.

## ADR-027 — Espace administrateur : tableau de bord, prospection, alertes, cloche, administrateurs

- **Menu** : « Tableau de bord » devient l'accueil (`/admin`) ; la liste des boutiques passe à `/admin/boutiques`. Nouveaux onglets Prospection et Administrateurs (super administrateurs seulement).
- **Ville et téléphone** : l'inscription ne demande ni ville ni téléphone. La ville et le téléphone d'un utilisateur sont ceux de sa première boutique ; sans boutique : « Ville non renseignée » et bouton WhatsApp désactivé (avec info-bulle).
- **Activité** : `User.lastActiveAt`, écrit au plus une fois toutes les 5 minutes depuis l'espace vendeur. « Utilisateurs les plus actifs » (30 jours) = connexions + produits ajoutés dans leurs boutiques (le produit n'a pas d'auteur) + commandes traitées (historique des commandes).
- **Prospection** : critères « Besoin d'assistance » et messages WhatsApp dans `src/config/prospection.ts` (aucun produit en ligne, pas de logo, pas de WhatsApp, ni livraison ni retrait). Filtres combinables dans l'adresse (`?filtre=actifs&filtre=assistance`), export CSV de la liste filtrée.
- **Alertes** : plus de messages échoués (ils gardent leur page « Messages échoués »). Restent : e-mails non confirmés depuis plus d'une heure (« Renvoyer l'e-mail de vérification »), suspicions de spam sur 24 h (50 produits créés, 10 produits du même nom, 3 descriptions avec liens externes ; « Ignorer », « Contacter », « Suspendre la boutique ») et tickets. Pas de système de signalement par les clients aujourd'hui : non couvert. Statuts : nouvelle / traitée ou ignorée, avec qui et quand (onglet « Traitées » + journal).
- **Tickets** : chaque message du formulaire Contact crée une demande (`SupportTicket`), même si l'e-mail à l'équipe échoue. Réponse par e-mail (nouveau modèle E27), statut ouvert / en cours / résolu, assignation à un administrateur.
- **Cloche** : `SystemNotification` (type, gravité, message, contexte, occurrences, première et dernière fois, lu le). Erreurs identiques regroupées par empreinte « type + message » (identifiants, e-mails et numéros retirés du message). Sources : `src/instrumentation.ts` (`onRequestError` : pages, routes, Server Actions, proxy), requêtes Prisma au-delà de `SLOW_QUERY_MS` (2 000 ms par défaut), échecs d'e-mails, échecs d'enregistrement d'images. Il n'existe pas encore de tâche planifiée : le type « tâche planifiée » est prêt pour le futur worker. La durée totale d'une page n'est pas mesurée (Next n'offre pas de point d'accroche fiable) : les lenteurs viennent des requêtes. Rafraîchissement toutes les 60 secondes, onglet visible seulement.
- **Administrateurs** : rôles ADMIN et SUPER_ADMIN (migrations `20261025150000_super_admin_role`, puis `20261025150100_admin_space_notifications_tickets` qui fait passer les administrateurs actuels en SUPER_ADMIN). Garde-fous : pas de changement de ses propres droits, jamais moins d'un super administrateur, case de confirmation obligatoire, journal d'audit, e-mail E26 à la personne promue. `npm run admin:promote` donne désormais le rôle SUPER_ADMIN (premier compte).
- **Nouvelles variables d'environnement (facultatives)** : `SLOW_QUERY_MS` (seuil des requêtes lentes, 2 000 par défaut).
