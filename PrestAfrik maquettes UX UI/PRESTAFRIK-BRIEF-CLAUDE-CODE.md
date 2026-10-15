# PrestAfrik — Brief de réalisation pour Claude Code

> **À lire en entier avant d'écrire la moindre ligne.** Ce document est le contrat de réalisation. Il complète le cahier des charges initial et les maquettes UI/UX. En cas de contradiction, l'ordre de priorité est : **(1) ce document**, **(2) les maquettes** (pour tout ce qui est visuel et ergonomique), **(3) le cahier des charges initial**.

Dernière mise à jour : 15 octobre 2026. Langue du produit et de la documentation : **français**.

---

## 0. Mode d'emploi

### 0.1 Ce que vous devez faire

Terminer **PrestAfrik**, un SaaS multi-boutiques qui permet à un vendeur camerounais de créer sa boutique en ligne, de recevoir des commandes sans compte client, de les faire confirmer par WhatsApp, d'organiser la livraison et de suivre l'argent encaissé. Paiement à la livraison. Pas d'IA dans cette version.

L'**étape 1 est déjà réalisée** (voir §3). Vous devez :

1. Appliquer les **ajustements sur l'existant** (§3.3).
2. Réaliser les **étapes 2 à 8** (§14) en reproduisant **fidèlement les maquettes**.
3. Livrer une application **entièrement fonctionnelle** : chaque bouton fait quelque chose de réel, chaque formulaire enregistre en base, chaque liste vient de la base.

### 0.2 Où sont les maquettes et comment les lire (à faire AVANT tout code)

**Situation :** les maquettes ont été **exportées en HTML, un fichier par page du canevas**, et **déposées dans un dossier du dépôt** (le même dépôt que le code). Le nom du dossier n'est pas figé : appelons-le **`<C:\Users\JeanPaulKOYABE\Desktop\PrestAfrik V2\PrestAfrik maquettes UX UI>`**.

1. **Repérez le dossier** : cherchez dans le dépôt un dossier contenant des fichiers `.html` d'export de maquettes (`git ls-files '*.html'`, noms évoquant « maquette », « design », « ux », « site », « assistant », « vendeur », « boutique », « admin », « emails »). S'il y a plusieurs candidats ou aucun, **demandez à l'utilisateur** avant de continuer.
2. **Les 6 pages exportées** correspondent aux 6 pages du canevas : **Site PrestAfrik**, **Assistant de création**, **Espace vendeur**, **Boutique publique (client)**, **Administration**, **E-mails**. Le contenu de chaque page (titres d'écrans, tailles, routes) est listé dans l'**inventaire du §13**. Les noms de fichiers peuvent différer des noms ci-dessus : rapprochez par le **contenu** et par les **titres d'écrans**.
3. **Ouvrez-les réellement.** Servez le dossier en statique (par exemple `npx serve <C:\Users\JeanPaulKOYABE\Desktop\PrestAfrik V2\PrestAfrik maquettes UX UI>`) et ouvrez chaque page avec **Playwright (Chromium)**. Attendez le chargement complet. Un fichier HTML lu comme du texte **ne suffit pas** : vous devez voir le rendu.
4. **Isolez chaque écran (artboard).** Le format exact de l'export est inconnu : inspectez le DOM et choisissez la première méthode qui fonctionne, puis **consignez-la** dans `docs/design/README.md` :
   - rechercher les éléments dont le **titre** correspond à un titre de l'inventaire (§13) ;
   - sinon, parcourir les `iframe` de la page (chaque écran peut y être isolé) ;
   - sinon, repérer les conteneurs racine de dimensions typiques (**1280 px** et **1440 px** de large pour l'ordinateur, **390 px** pour le téléphone, **720 px** pour les e-mails) ;
   - sinon, **demandez à l'utilisateur de réexporter** (un fichier HTML ou une image par écran).
5. **Produisez des références exploitables**, dans `docs/design/reference/<page>/<slug>/` : une **capture PNG** par écran (viewport = largeur de l'écran, `deviceScaleFactor: 2` pour les écrans mobiles), le **texte visible** (`.txt`), et le **HTML du sous-arbre** de l'écran. Générez `docs/design/INVENTAIRE.md` (tableau : page, écran, capture, route cible, état d'implémentation, mis à jour à chaque étape).
6. **Ressources manquantes.** L'export peut référencer des fichiers qui ne sont pas inclus (les adresses de type `/_blob/<identifiant>` : **logo PrestAfrik**, silhouette de l'Afrique en points de la landing page, captures de l'application, logo d'exemple de boutique). Écoutez les réponses réseau avec Playwright pour **lister toutes les ressources en erreur**, puis **demandez-les à l'utilisateur** :
   - le **logo PrestAfrik** (PNG fourni par l'utilisateur, fond transparent) → à placer dans `public/brand/` ;
   - la **silhouette de l'Afrique** : à demander, ou à recréer en SVG ;
   - les **captures** de la landing page : ce sont des illustrations ; elles seront **régénérées depuis l'application réelle** (étape 8) avec des données d'exemple.
7. **Polices.** Les exports chargent Poppins depuis Google Fonts. Dans l'application, utilisez **`next/font`** (auto-hébergée), jamais un lien externe.
8. **Ce qu'il faut ignorer dans l'export** : l'interface de l'éditeur de canevas (barres d'outils, cadres de noms, poignées), les scripts de l'éditeur (`dc-runtime`, `support.js`), les marges d'espacement entre écrans.
9. **Ne copiez pas le HTML tel quel.** Il est en styles en ligne, sans composants, sans accessibilité complète et non responsive. Reconstruisez chaque écran avec les composants React, les tokens de `src/styles/tokens.css` et les classes Tailwind. Extrayez de l'export : **les textes exacts, la hiérarchie, les espacements, les couleurs (déjà alignées sur les tokens), les états** (vide, erreur, succès, désactivé, ouvert).
10. **Les données des maquettes sont fictives** (noms, montants, numéros, adresses). Ne les mettez jamais en dur dans le code de production ; servez-vous-en pour le **seed**.
11. **Comparaison visuelle obligatoire** : après chaque écran implémenté, générez une capture **au même viewport que la maquette** (1280 ou 1440 ou 390 de large) avec les données du seed, puis une **planche côte à côte** (maquette / application) dans `docs/design/comparaison/<page>/<slug>.png`. Corrigez les écarts de structure, d'espacement, de couleur, de typographie et de texte. Les écarts dus aux données différentes sont acceptés.
12. **Les maquettes d'ordinateur sont à 1280 px** (landing 1440 px) et celles de téléphone à **390 px**. **Le comportement responsive intermédiaire (tablette, très petits téléphones) n'est pas maquetté** : c'est à vous de le concevoir selon le §4, en restant fidèle au style.

### 0.3 Points sur lesquels les maquettes sont en retard ou à corriger

| Sujet | Les maquettes disent | Règle à appliquer |
|---|---|---|
| Mot de passe | Maquettes à jour (8 caractères) ; le **code existant** et le document technique indiquent encore 10 | **8 caractères minimum** (§6.1). Corriger le code, les tests et les textes. |
| Reçu | Boutons « Imprimer le récapitulatif » (détail commande, résultat de commande) | **Aucun reçu n'est délivré.** Ne pas implémenter ce bouton ni la page imprimable. |
| Photos produit | La spec initiale ne fixait pas de limite | **5 photos maximum par produit** (§6.4). |
| Adresse de boutique | Parfois `mboa-style.prestafrik.com` | **Pour l'instant : `/boutique/[slug]`** (méthode d'origine, §6.5). Les sous-domaines sont préparés mais **désactivés**. |
| WhatsApp (API) | Pas d'écran dédié | Suivre §6.8. Le mode lien `wa.me` est le mode par défaut (maquette `WhatsAppLien`). |
| Affichage du mot de passe | Une icône œil (sans texte) | Voir §6.1 : **icône œil uniquement**, avec `aria-label`. |
| Commande directe sur WhatsApp | Maquettes `Commande` (incomplet) et `CommandeComplet` | Voir §6.6 : second bouton « Commander sur WhatsApp », actif seulement quand le formulaire est valide. |
| Assistant WhatsApp de la boutique | Maquettes `BoutiqueChat`, `ChatbotConfig` | Voir §6.15 : réponses guidées **sans IA**. |
| E-mails | Page « E-mails » du canevas (8 modèles) | Voir §6.16 et `PRESTAFRIK-MODELES-EMAILS.md` (25 modèles). |

### 0.4 Règles de travail

- Travaillez **par étapes cohérentes**. À la fin de chaque étape : ce qui est terminé, les tests lancés (réussis / échoués / non exécutés), comment tester à la main, mise à jour de `docs/implementation-status.md`.
- **Ne prétendez jamais** qu'une intégration externe fonctionne si elle utilise un simulateur. Tout simulateur est nommé et affiche un bandeau « Mode simulation ».
- Aucun `TODO` silencieux dans un parcours critique (inscription, commande, paiement, abonnement, permissions).
- Ne posez de questions que pour les décisions **bloquantes** (§15). Pour le reste : décidez, documentez dans `docs/decisions.md` (un ADR court par décision).
- Aucun secret réel dans le dépôt. Aucun envoi réel (message, e-mail, paiement) depuis le seed ou les tests, même si des secrets de production existent dans l'environnement.

### 0.5 Définition de « terminé » (DoD) pour chaque fonctionnalité

Une fonctionnalité n'est terminée que si **tout** ceci est vrai :

- [ ] Elle reproduit la maquette (desktop **et** mobile), états inclus : chargement, vide, erreur, succès, désactivé.
- [ ] Une **planche de comparaison** maquette / application est générée (§0.2, point 11) et les écarts sont corrigés.
- [ ] Elle est **responsive** (§4) et testée sur la matrice de viewports.
- [ ] Les entrées sont validées **côté serveur** avec Zod ; les erreurs sont affichées en français, par champ.
- [ ] Les permissions sont vérifiées côté serveur (`requireStoreAccess`) et testées (accès croisé refusé).
- [ ] Elle est couverte par des tests unitaires/intégration **et**, si c'est un parcours, par un test Playwright.
- [ ] Accessibilité vérifiée (§11.3) : clavier, focus visible, libellés, contrastes, axe sans violation critique.
- [ ] Les textes sont dans le fichier central des textes (§5.3), pas dans les composants.
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` passent.
- [ ] La documentation est mise à jour.

---

## 1. Produit en une page

- **Vendeur** (Propriétaire, Gestionnaire, Préparateur) : crée sa boutique via un assistant en 8 étapes, gère produits, commandes, clients, livraisons, argent reçu, équipe, abonnement.
- **Client acheteur** : aucun compte. Il commande avec son numéro WhatsApp, paie à la livraison, suit sa commande par un lien sécurisé.
- **Administrateur PrestAfrik** : supervise boutiques, abonnements, messages échoués, alertes, utilisateurs.
- **Confirmation WhatsApp, deux modes au choix du vendeur** : lien `wa.me` (par défaut, sans API) ou API WhatsApp Business (automatique).
- **Marque** : orange `#FF9900`, bleu nuit `#000026`, police **Poppins**. Le logo de chaque boutique est celui que le vendeur envoie ; le logo PrestAfrik n'apparaît que dans l'espace vendeur, l'authentification, l'administration et la landing page.

---

## 2. Stack et architecture (imposées)

| Élément | Choix |
|---|---|
| Framework | **Next.js 15.5** (App Router), **React 19** |
| Langage | **TypeScript 6** en mode `strict` (TypeScript 7 est **exclu** : Next 15 ne le supporte pas) |
| Base | **PostgreSQL 16** |
| ORM | **Prisma 6.19** (dépendance `@prisma/adapter-pg` ; en environnement normal, le moteur standard est accepté) |
| Style | **Tailwind CSS 3.4** relié aux variables CSS |
| Validation | **Zod 3** |
| Tests | **Vitest** (unitaire/intégration), **Playwright** (bout en bout + accessibilité avec `@axe-core/playwright`) |
| Téléphones | **libphonenumber-js** |
| Images | **sharp** |
| Polices | `next/font` (Poppins 400/500/600/700/800) |

**Architecture :** monolithe modulaire.

```
src/
  app/                 pages minces (aucune logique métier)
  components/ui/       Button, Input, Select, Combobox, Textarea, Card, Badge, Dialog,
                       Drawer, Tabs, Table, EmptyState, LoadingState, ErrorState,
                       Pagination, StatCard, ConfirmDialog, Toast, FileDropzone, PhoneInput,
                       PasswordInput, Stepper, Switch, Checkbox, Radio
  components/layout/   VendorShell, AdminShell, PublicShopShell, WizardShell, AuthShell
  components/shared/   composants métier réutilisables
  modules/<domaine>/   service.ts (logique), schemas.ts (Zod), queries.ts (lectures), types.ts
  lib/                 db, crypto, mailer, storage, rate-limit, money, phone, dates, logger
  config/              permissions, textes, plans, géographie, activités
  styles/              tokens.css, globals.css
prisma/                schema.prisma, migrations/, seed/
workers/               traitement des files (outbox, expiration des réservations, rappels)
tests/ e2e/ docs/
```

**Règles d'architecture :**

- La logique métier vit dans `modules/*/service.ts`, **jamais** dans une page ou un composant React.
- Accès base **centralisé** via `lib/db`. Aucun `new PrismaClient()` ailleurs.
- Services externes (WhatsApp, e-mail, paiement, stockage) derrière des **adaptateurs** à interface unique ; aucun appel direct dispersé.
- Composants serveur par défaut ; composants client uniquement pour l'interactivité.
- Pas de `any` non justifié (commentaire obligatoire). Pas de fichier > 400 lignes sans raison. Pas de composant dupliqué.
- Mutations : **Server Actions** (formulaires) ; **Route Handlers** pour uploads, webhooks, vérification de disponibilité, exports.
- Retour standard des actions : `{ ok: true, data } | { ok: false, error: { code, message, fields? } }`. Jamais d'exception brute vers l'interface.

---

## 3. État actuel (étape 1 réalisée) et ajustements

### 3.1 Ce qui existe

- Projet Next.js initialisé, `tokens.css` (orange/bleu nuit), Tailwind relié aux variables.
- Schéma Prisma : `User`, `Session`, `AuthToken`, `Store`, `Membership`, `Invitation`, `DevMail` + migration `20261011000000_init`.
- Modules `auth` (inscription, connexion, sessions, vérification d'e-mail, récupération) et `stores` (création, accès, invitations, couleurs, retrait de membre).
- Matrice de permissions explicite (`config/permissions.ts`) et `requireStoreAccess`.
- Pages minimales : inscription, connexion, sélecteur de boutique, création de boutique, page boutique, `/dev/inbox`.
- Seed déterministe (5 boutiques, 10 utilisateurs). 16 tests Vitest (auth, isolation, permissions, contraste).
- Docs : `README.md`, `docs/design-system.md`, `docs/implementation-status.md`, `docs/plan.md`.

### 3.2 Limites connues de l'existant

- La migration initiale a été **écrite à la main** (le moteur Prisma n'était pas téléchargeable). **Première action** : sur une machine normale, lancer `npx prisma migrate dev`, puis `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <url>` et corriger tout écart.
- Pas de limitation de débit. Pas d'en-têtes de sécurité. Pas de CI.
- Les tests tournent sur la base de développement : prévoir une **base de test dédiée** (§11.6).
- Docker n'a pas été exécuté : vérifier `docker-compose.yml`.

### 3.3 Ajustements obligatoires sur l'existant

| # | Ajustement | Détail |
|---|---|---|
| A1 | **Mot de passe : 8 caractères minimum** | `modules/auth/schemas.ts` : `min(10)` → `min(8)`, `max(128)`. Adapter les textes d'aide, les tests, `docs/`. Voir §6.1 pour la politique complète. |
| A2 | Hachage | Passer bcryptjs au coût **12** (ou migrer vers **Argon2id** avec re-hachage à la connexion). Documenter le choix. |
| A3 | Police Poppins | Charger via `next/font` dans `app/layout.tsx` ; `--font-body` et `--font-heading` pointent dessus. |
| A4 | Textes | Passer toute l'interface en **vouvoiement**, ton courtois et enthousiaste (§5). Compléter `config/texts.ts`. |
| A5 | Modèle de boutique | Étendre `Store` : pays, région, ville, activité, téléphone (3 champs : pays ISO, numéro national, E.164), WhatsApp (idem), e-mail de contact, adresse, logo, bannière, description, mode WhatsApp, `onboardingStep`, `publishedAt` (§6.3). |
| A6 | Adresse web | Conserver `slug` (règles §6.3). Route publique **`/boutique/[slug]`**. Ajouter la liste étendue des noms réservés. |
| A7 | Sécurité | Limitation de débit, en-têtes de sécurité, CSP, protection CSRF explicite (§11.1). |
| A8 | `DevMail` | Interdit en production (déjà bloqué) ; ajouter l'adaptateur SMTP réel derrière l'interface `Mailer`. |
| A9 | Session | Ajouter l'option « Rester connecté 30 jours » (§6.1). |
| A10 | CI | Pipeline GitHub Actions (§11.7). |

---

## 4. Responsive : exigence de premier rang

**Approche mobile-first.** La majorité des acheteurs commandent sur téléphone ; beaucoup de vendeurs gèrent aussi depuis leur téléphone. Un écran qui n'est pas utilisable à 360 px de large n'est **pas terminé**.

### 4.1 Points de rupture (Tailwind)

| Nom | Largeur | Usage |
|---|---|---|
| (base) | 0–639 px | Téléphone. Une colonne. |
| `sm` | ≥ 640 px | Grand téléphone / petite tablette portrait |
| `md` | ≥ 768 px | Tablette |
| `lg` | ≥ 1024 px | Ordinateur portable : le menu latéral devient fixe |
| `xl` | ≥ 1280 px | Largeur des maquettes desktop |

### 4.2 Règles de comportement

- **Espace vendeur** : au-dessous de `lg`, le menu latéral devient un **tiroir** (`Drawer`) ouvert par un bouton « Menu » dans la barre du haut ; la recherche globale devient une icône qui ouvre un champ plein écran.
- **Tableaux** : au-dessous de `md`, chaque ligne devient une **carte empilée** (nom en titre, pastilles de statut, montant, action principale). Aucun défilement horizontal de la page. Un tableau très large (import CSV, argent reçu) peut défiler **dans son propre conteneur** avec un indice visuel.
- **Formulaires** : une colonne ; labels au-dessus des champs ; boutons d'action collés en bas (barre fixe) sur mobile pour les pages longues (assistant, formulaire produit).
- **Boîtes de dialogue** : `Dialog` centré dès `md` ; **feuille basse** (bottom sheet) en dessous.
- **Cibles tactiles** : 44 × 44 px minimum. Espacement suffisant entre actions destructrices et actions normales.
- **Listes déroulantes** (`Combobox`) : plein écran ou feuille basse sur mobile pour éviter le clavier virtuel qui masque la liste.
- **Images** : `next/image`, tailles `sizes` adaptées, `loading="lazy"` sauf la première image visible. Ratios fixes pour éviter les décalages (CLS).
- **Typographie** : tailles fluides raisonnables ; corps de texte ≥ 16 px sur mobile pour éviter le zoom automatique de iOS dans les champs.
- **Boutique publique et formulaire de commande** : conçus à 390 px d'abord (maquettes mobiles `Boutique`, `FicheProduit`, `Panier`, `Commande`, `ResultatCommande`, `Suivi`). Ils doivent aussi s'afficher proprement sur grand écran (colonne centrée ou grille plus large).
- **Landing page** : les téléphones et la tablette en 3D, la carte animée et la démo se **simplifient sur mobile** (rotations 3D réduites ou supprimées, animations lourdes désactivées) et **respectent `prefers-reduced-motion`**. Aucun contenu ne doit dépendre d'une animation pour être lisible.
- Jamais de défilement horizontal de la page. Jamais de texte tronqué sans alternative.

### 4.3 Matrice de test obligatoire

Playwright, chaque parcours clé exécuté sur : **360×640**, **390×844**, **768×1024**, **1280×800**, **1440×900**. Captures de référence pour : landing, connexion, accueil vendeur, liste de commandes, formulaire produit, assistant (étapes 3 et 4), boutique publique, formulaire de commande.

---

## 5. Expérience utilisateur et langage

### 5.1 Principes UX

- **Professionnel, simple, rassurant.** Une action principale par écran, en orange. Les actions secondaires sont en contour. Les actions destructrices sont rouges et toujours confirmées.
- **Zéro écran mort** : tout écran a un état vide utile (message chaleureux + action), un état de chargement (squelette), un état d'erreur (message clair + « Réessayer »).
- **Retour immédiat** : toute action affiche un retour (toast de succès, erreur sous le champ, bouton en chargement). Pas de double envoi : bouton désactivé pendant l'envoi.
- **Formulaires** : validation à la saisie quand c'est utile (adresse e-mail, disponibilité d'adresse), à l'envoi sinon. Le message d'erreur dit **quoi corriger et comment**.
- **Confirmation des actions irréversibles** avec explication des conséquences (voir la suppression de produit, §6.4).
- **Perte de saisie évitée** : l'assistant de création enregistre à chaque étape (brouillon) ; avertir avant de quitter un formulaire modifié.
- **Cohérence** : mêmes libellés, mêmes pastilles de couleur pour les mêmes statuts partout (§6.6).

### 5.2 Ton et langue

- **Vouvoiement partout**, vendeur comme client. Ton **professionnel, courtois, enthousiaste**, **très explicite**.
- Phrases courtes, vocabulaire simple, **sans jargon**. Exemples : « Mes produits », « Argent reçu », « Commandes à confirmer », « Mon équipe », « Livraison à organiser ».
- Sous chaque titre de page : une phrase qui explique à quoi sert l'écran (voir les maquettes).
- Touches positives dans les réussites et états vides (« Bravo ! », « Votre boutique prend vie ! », « Vos prochains clients vous attendent ! »).
- **Pas d'emoji** dans les messages de paiement, de sécurité ou d'erreur. Pas d'argot forcé, pas de caricature culturelle.
- Messages d'erreur : jamais « Erreur 500 » ou un message technique. Exemple : « Nous n'avons pas pu enregistrer votre produit. Vos informations sont conservées. Réessayez dans un instant. »

### 5.3 Centralisation des textes

Tous les textes visibles sont dans `src/config/texts/fr.ts` (objet typé, regroupé par domaine). Les composants reçoivent des clés, pas des chaînes. L'architecture doit permettre d'ajouter `en.ts` plus tard sans toucher aux composants (utiliser un petit utilitaire `t(key, params)` ou `next-intl`).

### 5.4 Formats d'affichage

| Donnée | Affichage |
|---|---|
| Montant | `28 500 FCFA` (espace insécable fine comme séparateur de milliers ; `Intl.NumberFormat('fr-FR')`) |
| Date | `11/10/2026` ; heure `14:02` ; fuseau **Africa/Douala (UTC+1)** |
| Téléphone | `+237 6 12 34 56 78` (format international lisible) |
| Référence de commande | `#MB-1042` |

---

## 6. Règles métier (contrat fonctionnel)

> **Identifiants d'écrans.** Les noms entre accents graves dans cette section (`Connexion`, `AssistantE3`, `FormProduit`, `BoutiqueChat`…) sont des **identifiants d'écrans**. Retrouvez chaque écran par son **titre** dans l'inventaire du §13 (colonne « Identifiant »).

### 6.1 Comptes, mots de passe, sessions

**Politique de mot de passe (décision produit : 8 caractères minimum).**

| Règle | Valeur |
|---|---|
| Longueur | **minimum 8**, maximum 128 caractères |
| Composition imposée | **Aucune** (ni majuscule, ni chiffre, ni symbole obligatoires), conformément aux recommandations NIST SP 800-63B |
| Caractères | Tous les caractères Unicode acceptés (espaces compris) ; **le collage est autorisé** |
| Mots de passe courants | Refuser les mots de passe de la liste des plus courants (liste locale ≥ 10 000 entrées, par exemple `10-million-password-list-top-10000`) et ceux contenant l'e-mail ou le nom |
| Indicateur de solidité | Consultatif uniquement (bibliothèque `@zxcvbn-ts/core`), jamais bloquant au-delà du minimum et de la liste de refus |
| Affichage | **Icône œil seule, sans texte**, à droite du champ (maquettes `Connexion`, `Inscription`) : œil ouvert quand le mot de passe est masqué, œil barré quand il est visible. C'est un vrai `<button type="button">` avec `aria-label="Afficher ou masquer le mot de passe"` (ou « Masquer le mot de passe » selon l'état), `aria-pressed`, `aria-controls` et un `title`. Zone tactile ≥ 40 × 40 px. Le champ bascule `type="password"` ↔ `type="text"` ; il **revient en mode masqué** après l'envoi du formulaire et quand l'onglet perd le focus longtemps. Aide sous le champ : « Astuce : cliquez sur l'œil pour vérifier votre saisie avant de valider. » |
| Attributs HTML | `autocomplete="current-password"` (connexion), `autocomplete="new-password"` (inscription, réinitialisation), `autocapitalize="off"`, `spellcheck="false"` |
| Stockage | Haché (bcrypt coût ≥ 12 ou Argon2id : m=19 Mio, t=2, p=1). **Jamais** journalisé, jamais renvoyé |
| Rotation | Pas d'expiration périodique forcée |

**Adresse e-mail** : normalisée en minuscules, trim, format valide, **unique**. Coche verte en direct quand elle est bien formée. Vérification par lien envoyé à l'inscription.

**Sessions.**

- Jeton opaque aléatoire (32 octets, base64url) ; **seule son empreinte SHA-256 est en base**. Cookie `httpOnly`, `Secure` (production), `SameSite=Lax`, `path=/`.
- « **Rester connecté 30 jours** » coché : session de 30 jours. Non coché : cookie de session (disparaît à la fermeture du navigateur) avec expiration serveur à 24 h.
- Déconnexion : suppression de la session côté serveur **et** du cookie. « Déconnecter tous les appareils » disponible dans Mon compte.
- Changement ou réinitialisation de mot de passe : **toutes les sessions sont révoquées**.

**Connexion.**

- Message unique pour e-mail inconnu et mot de passe faux : « E-mail ou mot de passe incorrect ». **Temps de réponse égalisé** (hachage factice).
- **Limitation de débit** : 5 échecs en 15 minutes pour un même couple IP + e-mail → attente de 15 minutes ; en plus, 20 tentatives / 15 minutes par IP. Message explicite avec le temps d'attente.
- Redirection vers la page demandée avant connexion (paramètre `next` **validé** : chemin interne uniquement, jamais d'URL absolue).

**Inscription.** Champs : nom (2–80), e-mail, mot de passe (8–128), case « J'accepte les conditions d'utilisation et la politique de confidentialité » (obligatoire, version acceptée et date enregistrées). Création du compte → e-mail de vérification (lien à usage unique, 48 h) → session → redirection vers l'assistant de création. Le compte est utilisable avant vérification (bandeau de rappel) ; **la publication de boutique exige un e-mail vérifié**.

**Récupération.** `/mot-de-passe` (e-mail) : réponse **identique** que le compte existe ou non. Lien à usage unique valable **60 minutes**. `/mot-de-passe/nouveau?token=` : nouveau mot de passe (8–128).

**Invitations d'équipe.** Lien à usage unique, **7 jours**, valable uniquement pour le compte portant l'adresse invitée.

### 6.2 Multi-boutiques et permissions

- Toute opération sur une boutique passe par `requireStoreAccess(userId, storeId, permission)` : vérifie l'utilisateur connecté, son appartenance, son rôle, la permission. **Le `storeId` envoyé par le navigateur n'est jamais cru.**
- Boutique inexistante et boutique d'autrui renvoient **la même erreur** « introuvable » (pas de fuite d'existence).
- L'isolation couvre : lectures, écritures, exports, **fichiers (chemins de stockage préfixés par `storeId`)**, tâches asynchrones, caches (clés préfixées), webhooks.
- Un utilisateur peut appartenir à plusieurs boutiques, avec un rôle différent dans chacune ; sélecteur de boutique dans la barre du haut.
- Matrice de permissions (déjà dans `config/permissions.ts`) :

| Permission | Propriétaire | Gestionnaire | Préparateur |
|---|---|---|---|
| Voir la boutique | ✔ | ✔ | ✔ |
| Modifier la boutique, publier | ✔ | ✔ | ✘ |
| Supprimer la boutique | ✔ | ✘ | ✘ |
| Voir l'équipe | ✔ | ✔ | ✘ |
| Inviter / retirer un membre | ✔ | ✘ | ✘ |
| Voir le catalogue | ✔ | ✔ | ✔ |
| Modifier le catalogue | ✔ | ✔ | ✘ |
| Voir les commandes | ✔ | ✔ | ✔ |
| Traiter les commandes | ✔ | ✔ | ✔ |
| Annuler une commande | ✔ | ✔ | ✘ |
| Voir / exporter les clients | ✔ | ✔ | ✘ |
| Voir / enregistrer les paiements | ✔ | ✔ | ✘ |
| Gérer l'abonnement | ✔ | ✘ | ✘ |

Les entrées de menu et boutons non autorisés sont **masqués** (et refusés côté serveur). Le Propriétaire ne peut pas être retiré ; le transfert de propriété est hors version 1.

### 6.3 Assistant de création de boutique (8 étapes + publication)

**Maquettes :** `AssistantE1` à `AssistantE9`. **Mise en page :** `WizardShell` (en-tête avec logo, barre de progression, liste des étapes à gauche, carte centrale, **aperçu de la boutique en direct à droite**). Sur mobile : liste des étapes réduite en « Étape n sur 8 », aperçu repliable, boutons Retour / Continuer collés en bas.

**Fonctionnement.**

- La boutique est créée en **brouillon** à la fin de l'étape 1 (`Store.status = DRAFT`, `onboardingStep`). **Chaque étape est enregistrée** à la validation ; l'utilisateur peut quitter (« Enregistrer et quitter ») et reprendre exactement où il s'est arrêté.
- Le bouton « Retour » ne perd pas la saisie. L'aperçu en direct se met à jour pendant la saisie.
- Étapes 1 à 6 obligatoires sauf mention ; l'étape 7 (premier produit) est **facultative** (« Passer cette étape »).

| Étape | Champs | Règles |
|---|---|---|
| 1. Nom | **Nom** (2–60). **Adresse** (slug) | Slug : `^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$` (3 à 40, minuscules, chiffres, tirets, ni tiret en début/fin). Généré depuis le nom (sans accents), modifiable. **Unique**. Liste de noms **réservés** refusés (`admin`, `api`, `app`, `www`, `mail`, `dev`, `boutique`, `connexion`, `inscription`, `suivi`, `static`, `assets`, `support`, `aide`, `contact`, `blog`, `shop`, `ftp`, `webhook`, `status`, etc.). Vérification de disponibilité **en direct** (anti-rebond 400 ms, route limitée en débit) + contrainte d'unicité en base (gérer l'erreur `P2002`). Suggestions d'adresses libres si prise. |
| 2. Activité | **Activité principale** (liste déroulante avec **recherche**) | Table `Activity` (seed : Vêtements et mode, Beauté et cosmétiques, Maison et décoration, Artisanat, Accessoires, Alimentation, Électronique, …). Raccourcis « les plus choisies ». Option **« Mon activité n'est pas dans la liste »** → champ libre (80 car.). |
| 3. Localisation | **Pays**, **Région**, **Ville**, Quartier (facultatif) | **Listes dynamiques en cascade** : la région dépend du pays, la ville dépend de la région. Voir « Listes géographiques » ci-dessous. Option **« Ma ville n'est pas dans la liste »** → saisie libre. |
| 4. Coordonnées | **Téléphone** (indicatif + numéro, **deux champs séparés**), **WhatsApp** (idem), case « même numéro », e-mail de contact (facultatif) | Voir « Téléphones » ci-dessous. |
| 5. Thème | Thème (3 cartes) | Valeurs : `catalogue-express` (défaut), `mode-beaute`, `boutique-de-marque`. Même fonctionnalités, mise en page différente. **Changer de thème n'efface rien.** |
| 6. Logo et couleurs | **Logo** (facultatif), 3 couleurs | Logo : PNG/JPG/WebP, **2 Mo max**, vérifié par signature binaire, redimensionné (carré, 512 px), converti WebP. Sans logo : **initiales** de la boutique. Couleurs : `#RRGGBB` strict ; seules `color-brand-primary`, `-secondary`, `-accent` modifiables ; **contrôle de lisibilité** WCAG (rapport ≥ 4,5:1 entre couleur de bouton et son texte) ; texte du bouton choisi automatiquement (blanc ou bleu nuit). « Revenir aux couleurs PrestAfrik ». |
| 7. Premier produit | Nom, prix, photos (**5 max**) | Même validation que le formulaire produit (§6.4). |
| 8. Publication | Récapitulatif modifiable | Bouton « Publier ma boutique ». |

**Conditions de publication** (la liste de ce qui manque s'affiche sinon) : nom, adresse, activité, localisation, téléphone, thème, **e-mail du compte vérifié**, essai ou abonnement valide, **au moins un produit actif** *ou* l'assistant a été complété avec un produit, et **au moins une zone de livraison ou le retrait activé** (si aucune zone n'existe encore, créer à la publication une zone par défaut « Ma ville » avec frais « à confirmer » et le signaler). Après publication : écran de félicitations (`AssistantE9`) avec **lien de la boutique, QR code (PNG téléchargeable), bouton « Partager sur WhatsApp »** (lien `wa.me/?text=`), puis propositions : régler les zones de livraison, ajouter des produits, aller au tableau de bord.

**Listes géographiques (liste dynamique).**

- Pays : jeu ISO 3166-1 (alpha-2) avec noms français (`i18n-iso-countries`), **Cameroun en premier**. Au lancement, **région et ville complètes pour le Cameroun** (10 régions, chefs-lieux et principales villes, fichier `config/geo/CM.json` versionné) ; pour les autres pays : région/ville en **saisie libre** tant que le jeu de données n'est pas fourni. Prévoir le format pour en ajouter sans changer le code.
- API interne : `getCountries(q)`, `getRegions(countryIso, q)`, `getCities(countryIso, regionCode, q)` ; recherche **insensible aux accents et à la casse** (`normalize('NFD')`), résultats limités (≤ 50), triés.
- Composant `Combobox` conforme au **pattern ARIA « combobox »** (WAI-ARIA Authoring Practices) : `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, clavier (↑ ↓ Entrée Échap Début Fin), filtrage pendant la frappe, option « non listé ». Sur mobile : feuille basse.
- Changer le pays réinitialise région et ville (avec message explicite).

**Téléphones (indicatif séparé du numéro).**

- Deux champs : **liste d'indicatifs** (`PhoneInput` : pays + indicatif, recherche par nom ou par indicatif, `+237` / Cameroun par défaut) et **numéro national** (chiffres, espaces tolérés, zéro initial éventuel retiré).
- Validation avec **`libphonenumber-js`** (`parsePhoneNumberFromString(national, countryIso)` puis `isValid()`). **Ne pas coder à la main les formats nationaux.** Messages : « Ce numéro ne semble pas valide pour le Cameroun (+237). »
- Stockage : `phoneCountry` (ISO2), `phoneNational`, `phoneE164` (`+2376XXXXXXXX`). L'E.164 est la **valeur de référence** (déduplication, `wa.me`, envois).
- Un numéro de format valide **ne prouve pas** qu'il appartient à la personne ni qu'il a WhatsApp : ne jamais l'affirmer.
- Case « Mon numéro WhatsApp est le même que mon téléphone » : coché par défaut ; décocher active le second `PhoneInput`.

### 6.4 Catalogue : produits (CRUD complet), catégories, images

**Maquettes :** `Produits` (liste), `AjoutProduit`, `FormProduit` (modification), `SupprimerProduit` (dialogues), `ImportCSV`.

**Champs du produit.**

| Champ | Règles |
|---|---|
| Nom | requis, 2–120 |
| Description | facultative, texte simple, ≤ 2000, **aucun HTML** |
| Catégorie | liste + création à la volée ; de la même boutique ; nom unique par boutique |
| Prix | **entier XAF ≥ 0**, requis. **Jamais de flottant** pour l'argent |
| Prix promotionnel | facultatif, entier, **strictement inférieur** au prix |
| Référence (SKU) | facultative, ≤ 40, **unique par boutique** |
| Disponibilité | `AVAILABLE` (Disponible), `OUT_OF_STOCK` (Épuisé), `ON_DEMAND` (Sur commande) |
| Suivre le stock | booléen ; si vrai, quantité entière ≥ 0 requise. À 0 : passe automatiquement en `OUT_OF_STOCK`. `ON_DEMAND` : stock non contrôlé |
| Variantes | jusqu'à **3 options** (ex. Taille, Couleur) et **100 variantes** ; chaque variante : référence, **prix facultatif** (sinon celui du produit), stock |
| Mis en avant | booléen |
| État | `ACTIVE`, `DRAFT`, `ARCHIVED` |

**Images : jusqu'à 5 par produit.**

- **Plafond appliqué à trois niveaux** : (1) l'interface masque la zone d'ajout à 5 ; (2) le service refuse un 6ᵉ fichier avec le message « Vous avez atteint la limite de 5 photos par produit. » ; (3) la **base l'interdit** : table `ProductImage` avec `position SMALLINT CHECK (position BETWEEN 0 AND 4)` et `UNIQUE (productId, position)`.
- Formats **JPG, PNG, WebP** ; **5 Mo maximum par fichier** ; dimensions minimales 400 px, maximales 8000 px.
- **Vérification du contenu réel** (signature binaire « magic bytes », par exemple `file-type`), jamais de confiance dans l'extension ni dans le `Content-Type` envoyé.
- Traitement avec **sharp** : retrait des métadonnées EXIF (dont la géolocalisation), rotation selon l'orientation, conversion en **WebP**, génération de **3 tailles** (320, 800, 1600 px de large), nom de fichier aléatoire (`uuid`). Aucun nom de fichier utilisateur n'est conservé.
- Stockage via l'interface `StorageAdapter` : disque local en développement, **stockage objet compatible S3** en production. Chemin : `stores/{storeId}/products/{productId}/{uuid}-{taille}.webp`. Cache `immutable` long.
- Interface : **glisser-déposer** et sélecteur de fichiers, **aperçus**, **barre de progression par fichier**, compteur « 3 sur 5 », **première photo = photo principale**, **réorganisation** par glisser (et boutons accessibles « Monter / Descendre » pour le clavier), suppression par la croix avec confirmation légère, **texte alternatif** facultatif par photo. Gestion des erreurs **par fichier** (type refusé, trop lourd, échec réseau) sans bloquer les autres.
- Upload via **Route Handler** `POST /api/stores/[storeId]/products/[productId]/images` (multipart, limite de taille de requête, `runtime = 'nodejs'`), authentifié et autorisé (`catalog.edit`). Pour un produit pas encore enregistré : créer d'abord le brouillon.
- Suppression d'un produit ou d'une photo : tâche de **nettoyage des fichiers orphelins** (worker).
- Texte alternatif et ordre sont sauvegardés avec le produit ; les photos téléversées mais pas enregistrées sont nettoyées après 24 h.

**CRUD et cycle de vie.**

| Action | Règle |
|---|---|
| **Créer** | Formulaire `AjoutProduit`. Enregistrer en `DRAFT` ou `ACTIVE`. |
| **Lire** | Liste paginée côté serveur (25/page), recherche (nom, référence), filtres (catégorie, disponibilité, état), onglets Actifs / Brouillons / Archivés avec compteurs. |
| **Modifier** | Bouton « Modifier » ou menu « ⋯ ». Formulaire `FormProduit` prérempli. **Contrôle de concurrence optimiste** (champ `version` ou `updatedAt`) : si le produit a changé entre-temps, message explicite et proposition de recharger. |
| **Dupliquer** | Copie en `DRAFT`, **sans photos ni stock**, nom « Copie de … ». |
| **Archiver** | Le produit disparaît de la boutique, **reste dans l'historique des commandes** ; restaurable depuis l'onglet Archivés. |
| **Supprimer** | **Définitif uniquement si le produit n'a jamais été commandé** (aucune `OrderItem` n'y fait référence) ; supprime aussi ses photos. Sinon, le dialogue explique pourquoi et **propose l'archivage** (maquette `SupprimerProduit`, les deux cas). |
| **Actions groupées** | Cases à cocher + barre « N produits sélectionnés » : Archiver, Supprimer (mêmes règles ; le rapport indique ce qui a été fait et ce qui a été archivé à la place). |

Toute modification de produit **n'altère pas l'historique** des commandes (copie figée, §6.6). Journal des modifications (`AuditLog`).

**Import / export CSV.**

- Import : fichier ≤ 5 Mo et ≤ 1000 lignes ; **aperçu** des 20 premières lignes ; nombre de lignes valides / en erreur ; **rapport d'erreurs téléchargeable** (ligne, colonne, message) ; confirmation = import des lignes valides. Colonnes : `reference, nom, description, categorie, prix, prix_promo, disponibilite, stock`. Une référence existante **met à jour** le produit. Encodage UTF-8, séparateur `,` ou `;` détecté.
- Export : mêmes colonnes. **Protection contre l'injection de formules** : toute cellule commençant par `=`, `+`, `-`, `@`, tabulation ou retour chariot est préfixée par une apostrophe.

### 6.5 Boutique publique

**Maquettes :** `Boutique`, `FicheProduit`, `Panier`.

- **Adresse : `/boutique/[slug]`.** C'est la méthode retenue pour l'instant. Écrire une fonction `resolveStoreFromRequest(host, pathname)` qui retourne la boutique ; elle ne gère aujourd'hui que le chemin. Prévoir (sans l'activer) la résolution par **sous-domaine** `[slug].prestafrik.com` et par **domaine personnalisé**, derrière un indicateur `FEATURE_SUBDOMAINS=false`.
- Boutique en `DRAFT`, inexistante ou supprimée : **404** (aperçu réservé aux membres connectés). Suspendue ou en pause d'abonnement : page « Boutique temporairement indisponible ».
- Contenu : en-tête (logo ou initiales, nom, ville), recherche, catégories (pastilles défilantes), bandeau d'informations de livraison (généré depuis les zones), produits mis en avant, grille 2 colonnes (photo, nom, prix ; prix promo : ancien prix barré), badges « Épuisé » / « Sur commande », favoris **locaux** (localStorage, sans compte), barre « Voir mon panier (N) », pied de page (À propos, Contact, Livraison, FAQ, Confidentialité, Conditions de vente : **toujours accessibles**).
- **Panier** : conservé dans le navigateur ; les prix affichés sont **indicatifs** et toujours **recalculés** à la commande.
- **Personnalisation** : les couleurs de la boutique s'appliquent **uniquement au conteneur de la boutique** (variables CSS sur l'élément racine de la boutique), jamais à `:root`.
- **Pages éditoriales** (À propos, Contact, FAQ, page promotionnelle) : **blocs structurés** (titre, paragraphe, image, liste, bouton-lien, question-réponse, coordonnées). **Jamais de HTML ou JavaScript arbitraire** stocké ou exécuté.
- **SEO** : `generateMetadata` par boutique et produit, balises Open Graph, données structurées JSON-LD `Product`/`Offer` (devise `XAF`), `sitemap.xml` et `robots.txt` par boutique (brouillons en `noindex`).
- **Performance** : rendu serveur, mise en cache avec `revalidateTag` déclenché à chaque modification de produit/boutique. Objectifs mobiles : LCP ≤ 2,5 s, CLS < 0,1, INP < 200 ms.

### 6.6 Commandes, statuts, stock, doublons

**Parcours :** commande rapide (un produit) ou panier ; formulaire `Commande` ; écran de résultat ; suivi.

**Formulaire de commande.**

| Champ | Règles |
|---|---|
| Nom | requis, 2–80 |
| Téléphone WhatsApp | requis ; `PhoneInput` (indicatif + numéro), +237 par défaut ; E.164 stocké (§6.3) |
| Ville / Quartier / Point de repère | ville : zone desservie ou saisie libre ; quartier 2–80 ; repère ≤ 200 (**requis pour la livraison**, pas pour le retrait) |
| Livraison ou retrait | défaut livraison ; retrait masque quartier et repère et affiche l'adresse de retrait |
| Commentaire | ≤ 300, facultatif |
| E-mail | facultatif, format valide |
| Consentement au suivi WhatsApp | case **jamais précochée** ; requise pour commander (décision par défaut) |
| Consentement marketing | case **distincte, facultative, jamais précochée** |

**À la soumission** (une **transaction** avec **outbox**) : 1) valider (Zod) ; 2) **recalculer tous les prix depuis la base** ; 3) vérifier produits, variantes, disponibilité ; 4) vérifier la zone de livraison ; 5) calculer les frais connus ; 6) créer la commande avec **copie figée** des articles (nom, variante, prix, quantité, remise), des frais et de l'adresse ; 7) créer ou enrichir le client de la boutique ; 8) enregistrer les consentements (date, source, version du texte) ; 9) **réserver le stock** ; 10) écrire l'événement d'envoi dans l'outbox ; 11) afficher le résultat. **La commande est enregistrée même si WhatsApp échoue.**

- **Idempotence** : clé générée à l'ouverture du formulaire (`UNIQUE`) ; un second envoi renvoie la même commande.
- **Référence** : `#<préfixe>-<n>`, préfixe dérivé du nom de la boutique (2–3 lettres), `n` **séquentiel par boutique** via un compteur incrémenté **atomiquement** (`UPDATE ... SET value = value + 1 ... RETURNING value` dans la même transaction) ; `UNIQUE (storeId, reference)`.
- **Frais inconnus** : afficher « Frais de livraison à confirmer », **aucun total définitif**. Le vendeur fixe le montant ; **une nouvelle confirmation** est demandée au client.
- **Doublon probable** : même E.164 + mêmes articles en moins de 30 minutes → alerte « Doublon possible » côté vendeur. **Ne supprime jamais** une commande.
- **Suivi sans compte** : `/suivi/[jeton]`, jeton de 32 octets aléatoires (base64url), **seule l'empreinte est stockée**, limitation de débit, numéro partiellement masqué, aucune donnée sensible inutile.
- **Pas de reçu** : aucun reçu ni récapitulatif imprimable n'est produit.

**Commande directe sur WhatsApp (maquettes `Commande` et `CommandeComplet`).** Dans le formulaire « Finaliser ma commande », **deux boutons** sont proposés : « Commander » (orange, parcours standard) et « **Commander sur WhatsApp** » (vert, séparé par « ou »).

- **Activation** : le bouton WhatsApp est **désactivé** (`disabled` + `aria-disabled="true"`, couleur grisée) tant que le formulaire n'est pas **entièrement valide**, et **s'active en direct** dès que tous les champs obligatoires sont corrects. La validation côté navigateur **réutilise le même schéma Zod** que le serveur (module partagé) : pas de règle dupliquée. Champs obligatoires : nom, téléphone (indicatif + numéro valides), ville, quartier, point de repère (livraison seulement), consentement au suivi WhatsApp.
- **Retour utilisateur** : barre de progression « n sur 6 champs obligatoires remplis », message « Tout est prêt ! » à 6/6, texte d'aide sous le bouton listant ce qu'il reste à renseigner, **erreur par champ** en français (« Indiquez votre numéro WhatsApp, sans l'indicatif. »), coche verte sur les champs valides.
- **Action** : au clic, une **Server Action** crée la commande **exactement comme « Commander »** (mêmes validations, recalcul des prix, réservation de stock, **clé d'idempotence**, consentements), **puis** renvoie l'URL `wa.me` construite avec le message préparé (référence, articles, montant ou « montant à confirmer », livraison) et la navigation s'y fait (`window.location` / lien). **La commande est donc enregistrée même si WhatsApp ne s'ouvre pas** ; l'écran de résultat propose alors le lien de secours.
- **Disponibilité** : le bouton n'est affiché que si la boutique a un **numéro WhatsApp configuré** (mode lien ou API). Sinon, seul « Commander » apparaît.
- **Protection** : pas de double envoi (bouton en chargement, clé d'idempotence) ; limitation de débit comme pour « Commander ».
- **Texte d'aide sous les boutons** : « Votre commande sera enregistrée, puis WhatsApp s'ouvrira avec votre message prêt à envoyer. Il suffira d'appuyer sur Envoyer. »
- Le message est celui du modèle « du client à la boutique » (§6.8). La confirmation client reste « En attente » jusqu'à validation par le vendeur ou par le lien de secours.

**Quatre statuts indépendants** (journalisés : qui, quand, avant, après).

| Axe | Valeurs | Transitions autorisées |
|---|---|---|
| Confirmation client | En attente, Confirmée, Modification demandée, Refusée, Expirée | En attente → Confirmée / Modification demandée / Refusée / Expirée. Modification demandée → Confirmée / Refusée / Expirée (après correction, nouveau message, retour à En attente) |
| Traitement vendeur | À vérifier, Acceptée, En préparation, Terminée, Annulée | À vérifier → Acceptée / Annulée ; Acceptée → En préparation / Annulée ; En préparation → Terminée / Annulée ; Terminée final |
| Livraison | À organiser, En cours, Livrée, Échouée, Retournée | À organiser → En cours ; En cours → Livrée / Échouée ; Échouée → À organiser / Retournée |
| Paiement | En attente, Partiel, Payé, Remboursé | **Dérivé des écritures de paiement** (§6.9) |

Implémenter les transitions dans une **machine d'états** par axe (table de transitions + fonction pure testée) ; toute transition non listée est refusée. **Accepter une commande non confirmée** exige un motif (liste courte + note), journalisé. **Annuler** : motif obligatoire, libère le stock réservé. **Un message lu n'est pas une confirmation.** **Livrée ne veut pas dire encaissée.**

**Pastilles de couleur** (uniformes partout) : vert = réussi, jaune = en attente/à surveiller, bleu = en cours, rouge = refusé/annulé/échoué, gris = neutre.

**Stock et concurrence.**

- Réservation temporaire à la commande : **30 minutes** sans confirmation (réglable), libérée à l'expiration ou à l'annulation (worker).
- Décrément **atomique** : `UPDATE "ProductVariant" SET "stockQty" = "stockQty" - $q WHERE id = $id AND "stockQty" >= $q` ; si 0 ligne affectée → rupture. **Deux clients ne peuvent pas acheter la dernière unité.** Test de concurrence obligatoire (deux transactions simultanées).

### 6.7 Clients (CRM) et consentements

**Maquettes :** `Clients`, `FicheClient`.

- Un client est identifié par **(storeId, phoneE164)**. Une nouvelle commande avec un numéro connu **enrichit** la fiche (adresse, nom plus complet) sans doublon. Cas ambigu (même numéro, nom très différent) : signalé au vendeur pour décision manuelle. **Aucune fusion entre boutiques.**
- Fiche : nom, WhatsApp, e-mail, source, première/dernière commande, chiffres (commandes, montant commandé, argent reçu), adresses, historique des commandes, **consentements** (suivi, marketing : date, source, version du texte ; bouton « Retirer le consentement marketing »), tags, notes datées, rappels, interactions.
- **Segments** (définitions exactes, seuils réglables) : *Nouveaux* (première commande < 30 jours) ; *Réguliers* (≥ 3 commandes non annulées) ; *Commandes non confirmées* ; *Inactifs* (aucune commande depuis 90 jours) ; *À recontacter* (rappel échu) ; *Acheteurs d'une catégorie*.
- **Droits de la personne** : suppression ou anonymisation d'un client sur demande (les commandes passées sont conservées sous forme **agrégée/anonymisée** pour la comptabilité du vendeur) ; export des données d'un client.
- Exports : permission `customers.export`, filtrés par boutique, protégés contre l'injection de formules, journalisés.

### 6.8 WhatsApp : deux modes au choix du vendeur

**Maquettes :** `WhatsAppLien` (mode par défaut), `ResultatCommandeWa`, `ResultatCommande`. Interface : `MessagingProvider { sendOrderConfirmation(), sendOrderUpdate(), verifyWebhook(), parseWebhook() }`.

**Mode 1 : lien `wa.me` (par défaut, aucun compte technique).**

- Configuration : numéro WhatsApp de la boutique (E.164), deux modèles de messages avec variables `{prenom} {reference} {articles} {montant} {livraison}`, deux interrupteurs (« Confirmer sur WhatsApp » après la commande ; « Écrire au client » dans la commande).
- Lien : `https://wa.me/<E164 sans +>?text=<message encodé avec encodeURIComponent>`. Si `{montant}` est inconnu → « montant à confirmer ». **Abréger** la liste d'articles (« … et 3 autres articles ») pour garder un lien utilisable (≈ 1500 caractères encodés max).
- **PrestAfrik n'envoie rien** : pas d'outbox, pas de webhook, **aucun statut envoyé/livré/lu**. Un clic sur le lien **ne prouve pas** l'envoi.
- La confirmation passe à « Confirmée » par : action du vendeur « Marquer confirmée par le client » (**journalisée**), ou confirmation du client sur le **lien de secours** du site (page `/suivi/[jeton]`). Sans confirmation après **48 h** : « Expirée » et apparition dans « à recontacter ».
- Bouton « Tester le lien » (ouvre `wa.me` vers le numéro de la boutique avec un message d'exemple).

**Mode 2 : API WhatsApp Business (avancé).**

- Prérequis affichés : compte Meta Business, numéro vérifié, **modèle de message approuvé**. Champs : identifiant du numéro, jeton d'accès, référence du modèle, secret du webhook. **Secrets chiffrés au repos** (clé applicative), jamais renvoyés au navigateur.
- **Vérifier les règles officielles en vigueur** de WhatsApp Business (modèles, fenêtre de conversation, consentement/opt-in) **avant** d'implémenter la production, et les consigner dans `docs/integrations.md`.
- Envoi via **outbox + worker** : tentatives limitées (3), délai croissant (1, 5, 30 min), journal des messages, alerte en cas d'échec.
- Webhooks : **signature vérifiée** (en-tête `X-Hub-Signature-256`, HMAC-SHA256 du corps brut avec le secret), **déduplication** par identifiant d'événement (`UNIQUE`), rattachés à **une boutique et une commande précises**. Une réponse ambiguë **ne confirme rien**.
- Statuts de message : En attente, Envoyé, Livré, Lu, Échoué. « Commande confirmée par le client » est un statut **distinct**.
- **Bascule** : le passage à l'API n'est proposé que si la configuration `wa.me` est enregistrée et le test de connexion API a réussi ; retour au lien possible à tout moment ; les commandes en cours gardent leur statut. Si l'envoi API échoue, l'écran de résultat propose le bouton `wa.me` en repli.
- **Panneau de simulation** (livraison, confirmation, modification, annulation, échec, webhook reçu deux fois) : **interdit en production** (garde `NODE_ENV` **et** indicateur de fonctionnalité), adaptateur « simulé » clairement identifié.

### 6.9 Livraison, encaissements, tableau de bord

**Maquettes :** `Livraison`, `ArgentRecu`, `Main`.

- **Zones** : nom (unique par boutique), villes/quartiers couverts, frais (entier XAF **ou** « à confirmer »), délai indicatif (texte), « validation par le vendeur » (la commande attend la confirmation des frais), active. **Retrait** : activer, adresse, horaires.
- **Livreurs** : nom, téléphone, actif. Assigner un ou plusieurs colis ; « Livrée » propose d'enregistrer la collecte ; « Échouée » exige un motif (client injoignable, adresse introuvable, refus, autre + note).
- **Paiements = journal d'écritures** (`Payment`, **append-only**) : type (paiement reçu, paiement partiel, collecte par livreur, reversement au vendeur, remboursement), montant entier **> 0**, date (jamais future), méthode (espèces, mobile money, autre), auteur, référence (≤ 60), note (≤ 200), livreur si collecte. Montant ≤ reste à payer ; remboursement ≤ montant payé. **Un paiement enregistré ne se modifie pas** : une erreur se corrige par une **écriture inverse** journalisée.
- **Statut de paiement dérivé** : En attente (somme nette = 0), Partiel (0 < somme < total), Payé (somme ≥ total), Remboursé.
- **Définitions du tableau de bord** (une seule implémentation en SQL, testée) :
  - *Commandes à confirmer* : confirmation En attente ou Modification demandée, traitement ≠ Annulée (valeur actuelle) ;
  - *Montant confirmé* : somme des totaux des commandes confirmées, non annulées, créées dans la période ;
  - *Argent reçu* : paiements et reversements de la période moins remboursements ;
  - *Reste à recevoir* : total des commandes confirmées non annulées moins paiements enregistrés (valeur actuelle) ;
  - *Sommes collectées non reversées* : collectes moins reversements (valeur actuelle) ;
  - *Clients réguliers* : ≥ 3 commandes non annulées.
- Filtres : aujourd'hui, 7 derniers jours, mois en cours, période personnalisée ; **fuseau Africa/Douala** pour les bornes. Toutes les statistiques viennent de la base.
- Liste « À faire aujourd'hui » : lignes à zéro masquées ; si tout est à zéro, message d'encouragement. Checklist de démarrage : étapes cochées **automatiquement** d'après les données.

### 6.10 Abonnements

**Maquette :** `Abonnement`.

- Essai gratuit **d'un mois calendaire** à partir de la création de la boutique. Fin = même quantième du mois suivant ; **si le jour n'existe pas, dernier jour du mois** (31 janvier → 28 février, ou 29 en année bissextile). **Tests obligatoires sur les fins de mois** et l'année bissextile.
- Offres (table `Plan`, prix de démonstration **configurables**) : Essentiel 3 000 FCFA/mois ou 30 000/an ; Business 7 500 ou 75 000 ; Pro 15 000 ou 150 000. Quotas configurables : produits, messages WhatsApp par mois, membres d'équipe. **Pas d'offre gratuite permanente.**
- Paiement via l'adaptateur `SubscriptionPaymentProvider` : fournisseur réel configurable ; **simulateur local** avec mention « Mode démonstration ». **Un paiement n'est jamais marqué réussi sur la foi du navigateur** : seul un **événement signé du fournisseur** ou une vérification côté serveur active l'abonnement. Événements **idempotents** (identifiant d'événement `UNIQUE`).
- Changement d'offre : montée immédiate ; baisse à la fin de la période payée. Rappels à **J-7, J-3, J-1** (bandeau + e-mail).
- **Expiration, restriction progressive** : jour J → bandeau d'alerte ; J+7 → plus de nouveaux produits ni de campagnes ; J+14 → boutique publique **mise en pause** (page « Boutique temporairement indisponible », plus de nouvelles commandes). Les données sont conservées ; l'espace vendeur reste accessible pour payer. **Les commandes déjà enregistrées restent consultables et traitables** (acceptation, livraison, encaissement).
- Un quota dépassé bloque **l'action concernée** avec un message clair et un lien vers le changement d'offre.

### 6.11 Marketing

**Maquette :** `Marketing`.

- Campagne : nom, audience (segment + filtres), modèle de message, limite d'envoi (≤ quota restant).
- **L'audience ne contient que les clients avec consentement marketing actif** ; le nombre est calculé et affiché. Chaque message offre un moyen de se **désinscrire** ; la désinscription retire immédiatement le client de toute audience. Chaque envoi est journalisé.
- **Confirmation explicite avant envoi** : « Envoyer à N clients ? » + case obligatoire.
- Sans intégration réelle configurée (mode lien) : fonctionnement en **simulation clairement affichée** (bandeau « Mode simulation », statut « Simulée »).

### 6.12 Équipe

**Maquette :** `Equipe`. Invitation (e-mail + rôle Gestionnaire ou Préparateur), liens **7 jours** à usage unique liés à l'e-mail invité, renvoi/annulation, changement de rôle et retrait (Propriétaire uniquement), tableau « Ce que chacun peut faire » **généré depuis la matrice de permissions** (jamais écrit à la main). Un membre retiré perd l'accès **immédiatement** (y compris sessions ouvertes : la permission est revérifiée à chaque requête).

### 6.13 Administration PrestAfrik

**Maquettes :** `Admin`, `AdminAbonnements`, `AdminMessages`, `AdminAlertes`, `AdminUtilisateurs`. Accès : rôle plateforme `ADMIN` **uniquement** (un vendeur n'y accède jamais). `AdminShell` distinct (pastille « Administration »).

- *Boutiques* : recherche, tableau (offre, abonnement, publication, commandes sur 30 jours), **Suspendre** (motif + confirmation, propriétaire prévenu, boutique publique indisponible).
- *Abonnements* : actifs, essais, expirés, échéances sous 7 jours ; actions Voir, Prolonger l'essai, Contacter.
- *Messages échoués* : boutique, raison (modèle non approuvé, numéro invalide, jeton expiré…), tentatives, heure. **Le contenu des messages et les numéros complets ne sont jamais affichés.**
- *Alertes* : Urgent / Important / Information, actions Ignorer et traiter ; onglets Ouvertes, Résolues, Ignorées.
- *Utilisateurs* : comptes, boutiques et rôles, dernière connexion, statut ; actions : envoyer un lien de réinitialisation, suspendre/rétablir l'accès.
- **Limites par conception** : l'administrateur ne voit **ni mots de passe, ni secrets, ni données clients** des boutiques (sauf décision explicite, tracée). **Toute action d'administration est journalisée** (qui, quand, quoi, cible).

### 6.14 Landing page

**Maquette :** `Landing` (1440 px). Page publique `/`, rendue côté serveur, `title`, description, Open Graph.

Sections, dans l'ordre : en-tête (menu Accueil, Fonctionnalités, Démo, Tarifs, À propos, Contact + Se connecter / Essai gratuit) → **héro** (fond bleu nuit, carte de l'Afrique en points lumineux, repère sur le Cameroun, notifications de villes, **tablette** + **téléphone**) → **CRM et prospection ciblée** (constructeur d'audience animé) → **démo « Une commande, de A à Z, en 4 gestes »** → **espace vendeur en captures** (onglets sur tablette) → **côté client sur téléphone** (3 téléphones **statiques**) → **WhatsApp : deux façons** → fonctionnalités → tarifs (lus depuis la table `Plan`) → À propos → FAQ → Contact → appel final → pied de page.

- Animations **en CSS**, sans bibliothèque ; **`prefers-reduced-motion` respecté** ; simplifiées sur mobile ; aucun contenu invisible sans animation ; aucune animation sur les messages de paiement/sécurité.
- Les captures sont **de vraies captures de l'application** (données d'exemple, mention « données d'exemple »), à régénérer quand l'interface change. Aucun témoignage, chiffre de clients ou logo de référence **tant qu'ils ne sont pas réels**.
- Formulaire de contact : validation, limitation de débit, anti-spam (champ piège + limitation), envoi réel via `Mailer`. Coordonnées affichées à renseigner par l'utilisateur.

### 6.15 Assistant WhatsApp de la boutique (réponses guidées, sans IA)

**Maquettes :** `Boutique` (bouton flottant), `BoutiqueChat` (discussion ouverte), `ChatbotConfig` (réglages vendeur). **Aucune intelligence artificielle** : l'assistant est un **arbre de réponses guidées** rédigées par le vendeur. Il permet au visiteur de poser une question rapide puis de **continuer avec le vendeur sur WhatsApp**.

**Côté visiteur (boutique publique).**

- Bouton flottant vert en bas à droite (« Une question ? » + icône de discussion, `aria-label="Discuter avec la boutique sur WhatsApp"`), placé **au-dessus de la barre « Voir mon panier »**. Il s'ouvre en **feuille basse** (mobile) ou en **panneau flottant** (grand écran).
- La discussion est une boîte de dialogue accessible : `role="dialog"`, `aria-modal`, **focus piégé** puis restitué à la fermeture, fermeture par la croix et par **Échap**, zone de messages en `aria-live="polite"`.
- Contenu : message d'accueil, **boutons de questions rapides** (jusqu'à 6), réponse du vendeur à chaque choix, puis « Autre question » et « **Parler au vendeur** ». Un champ « Écrire votre question… » permet une question libre qui est **transmise telle quelle** dans le message WhatsApp (aucune interprétation).
- **Transfert** : une carte « Votre message est prêt » affiche le texte prérempli et le bouton « **Continuer sur WhatsApp** » (lien `wa.me/<E164>?text=<message encodé>`). Mention : « En continuant, vous ouvrez WhatsApp. Aucun message n'est envoyé sans votre accord. » Le visiteur appuie lui-même sur **Envoyer** dans WhatsApp.
- **Vie privée** : **aucune donnée n'est envoyée à PrestAfrik** pendant la discussion (tout se passe dans le navigateur à partir de la configuration chargée) ; aucun cookie de suivi ; pas d'enregistrement du texte saisi. Seul un compteur anonyme d'ouvertures peut être ajouté, sans identifiant.
- **Performance** : le widget est **chargé à la demande** (au clic sur le bouton ; le bouton seul est dans le HTML initial), n'impacte pas le LCP et pèse peu.
- Affichage sur les pages choisies par le vendeur : accueil, fiches produit, panier, formulaire de commande (défaut : les trois premières). Variables du message : `{boutique}`, `{question}`, `{produit}` (nom du produit consulté), `{page}`.
- Hors horaires (si les horaires de la boutique sont renseignés) : message dédié.
- Visible uniquement si la boutique a un **numéro WhatsApp** et que l'assistant est **activé**.

**Côté vendeur** (`/app/[storeId]/boutique/assistant`, permission `store.update`).

| Champ | Règles |
|---|---|
| Activer l'assistant | interrupteur |
| Message d'accueil | requis, ≤ 200, variable `{boutique}` |
| Questions rapides | **6 au maximum** ; chacune : texte du bouton (≤ 30), réponse (≤ 500), activée/désactivée ; ajout, suppression, réorganisation |
| Message prérempli de transfert | requis, ≤ 300, variables autorisées uniquement (liste blanche) |
| Où l'afficher | cases : accueil, fiches produit, panier, formulaire de commande |
| Message hors horaires | facultatif, ≤ 300 |

Aperçu **en direct** à droite. Contenu **en texte simple** (aucun HTML). Modèle de données : `StoreChatConfig` (1 par boutique) et `StoreChatQuickReply` (`storeId`, `label`, `answer`, `position`, `enabled`). Toute modification invalide le cache de la boutique publique (`revalidateTag`).

### 6.16 E-mails transactionnels

**Source de référence : `PRESTAFRIK-MODELES-EMAILS.md`** (25 modèles avec objet, pré-en-tête, contenu, variables et règles) et la **page « E-mails »** du canevas (8 modèles maquettés). Règles clés :

- Ton **professionnel, courtois, explicite**, vouvoiement ; une seule action principale par e-mail (bouton orange, texte bleu nuit) ; durées de validité et conséquences toujours indiquées ; phrase de sécurité (« Vous n'êtes pas à l'origine de cette demande ? Ignorez ce message ») quand c'est pertinent.
- **Aucun secret, jeton ou numéro complet** dans les contenus ou les journaux. Liens à usage unique, empreinte SHA-256 stockée.
- Gabarits React Email ou MJML, **version texte obligatoire**, compatibilité clients de messagerie et mode sombre, tests de remplacement de toutes les variables, aperçu dans `/dev/inbox`.
- Interface `Mailer` à deux implémentations : base de développement (`DevMail`, interdite en production) et SMTP/API réel ; **file d'envoi** avec 3 tentatives ; **SPF, DKIM, DMARC** configurés avant la production ; limitation de débit par compte.
- Notifications d'activité (équipe, commandes, messages échoués, quotas) **désactivables** dans les préférences ; e-mails de sécurité et de facturation toujours envoyés.
- Hors périmètre : e-mails aux clients acheteurs (le canal est WhatsApp) et **tout reçu de commande**.

---

## 7. Modèle de données (extensions à créer)

Montants en **`Int`** (XAF entiers ; agréger en `BIGINT` côté SQL). Dates en `timestamptz` (UTC). Tout enregistrement métier porte un **`storeId`** indexé.

| Entité | Points clés |
|---|---|
| `Store` (étendre) | `slug` unique, `status`, `theme`, `colorOverrides`, pays/région/ville/quartier, `activityId`/`activityOther`, `phoneCountry/phoneNational/phoneE164`, idem WhatsApp, `contactEmail`, `logoKey`, `bannerKey`, `description`, `whatsappMode` (`LINK`/`API`), `whatsappLinkTemplates`, `onboardingStep`, `publishedAt` |
| `Activity` | `slug`, `label`, `position` (seed) |
| `Category` | `storeId`, `name`, `position` ; `UNIQUE(storeId, name)` |
| `Product` | `storeId`, `name`, `description`, `categoryId`, `price`, `promoPrice`, `sku`, `availability`, `trackStock`, `stockQty`, `featured`, `status`, `version`, `archivedAt` ; `UNIQUE(storeId, sku)` partiel (si non nul) ; `CHECK (promoPrice IS NULL OR promoPrice < price)` |
| `ProductImage` | `productId`, `storeId`, `key`, `position SMALLINT` **`CHECK (0..4)`**, `alt`, `width`, `height` ; **`UNIQUE(productId, position)`** |
| `ProductOption` / `ProductVariant` | options (nom, valeurs), variantes (`optionValues`, `sku`, `price?`, `stockQty`) |
| `Customer` | `storeId`, `name`, `phoneE164`, `email`, `source`, `firstOrderAt`, `lastOrderAt`, `anonymizedAt` ; **`UNIQUE(storeId, phoneE164)`** |
| `Consent` | `customerId`, `kind` (`ORDER_TRACKING`, `MARKETING`), `grantedAt`, `revokedAt`, `source`, `textVersion` |
| `Order` | `storeId`, `reference` (`UNIQUE(storeId, reference)`), `customerId`, 4 statuts, `subtotal`, `discount`, `deliveryFee` (nul = à confirmer), `total`, `idempotencyKey` **unique**, `trackingTokenHash` unique, `mode`, adresse figée, `comment` |
| `OrderItem` | copie figée : nom, variante, prix, quantité, remise ; `productId` (référence, non utilisée pour l'affichage) |
| `OrderEvent` | journal des changements (auteur, type, avant, après) |
| `StockReservation` | `orderId`, cible, quantité, `expiresAt`, `releasedAt` |
| `StoreCounter` | compteur atomique par boutique (références) |
| `DeliveryZone`, `Courier`, `Delivery` | voir §6.9 |
| `Payment` | journal append-only ; `reverses` (écriture inverse) |
| `OutboxEvent`, `MessageLog`, `WebhookEvent` | file durable, journal des messages, déduplication |
| `Plan`, `Subscription`, `SubscriptionPayment` | voir §6.10 |
| `Campaign`, `CampaignRecipient` | voir §6.11 |
| `AuditLog` | `storeId?`, auteur, action, cible, date (aussi pour l'administration) |
| `RateLimit` | compteurs (si implémentation en base) |

**Index à ne pas oublier** : `(storeId, status, createdAt)` sur commandes et produits ; `(storeId, phoneE164)` ; unicité des clés d'idempotence, des références, des identifiants d'événements de webhook.

---

## 8. Sécurité (contrat)

- **Référentiel : OWASP ASVS niveau 2** et OWASP Top 10. Rédiger `docs/security.md` qui rattache chaque mesure à une exigence.
- Validation serveur de **toute** entrée (Zod) ; sorties encodées ; **aucun `dangerouslySetInnerHTML`** sauf contenu assaini (DOMPurify côté serveur) — en pratique, les pages éditoriales utilisent des blocs structurés, donc jamais.
- **CSRF** : Server Actions (vérification d'origine intégrée de Next) + `SameSite=Lax` + vérification explicite de l'en-tête `Origin` sur les Route Handlers qui modifient des données. Webhooks : signature, pas de cookie.
- **En-têtes** : `Content-Security-Policy` (avec nonce ; `default-src 'self'`, `img-src 'self' data: blob: <domaine de stockage>`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictive. Pas de `X-Powered-By`.
- **Limitation de débit** (interface `RateLimiter`, implémentation base de données ou Redis) : connexion, inscription, récupération, vérification d'adresse, soumission de commande, suivi, contact, upload.
- **Uploads** : liste blanche de types, vérification de signature, taille limitée, retraitement sharp, noms aléatoires, stockage hors racine web, jamais d'exécution.
- **Secrets** : variables d'environnement validées au démarrage (Zod) ; secrets d'intégration **chiffrés en base** (AES-256-GCM, clé applicative) ; `.env.example` sans secret ; analyse de secrets dans la CI.
- **Journaux** : `pino` avec **redaction** (mots de passe, jetons, numéros complets, cookies). Aucun numéro complet dans les logs applicatifs.
- **Erreurs** : jamais de trace ni de détail interne vers le client ; identifiant de corrélation affiché pour le support.
- **Dépendances** : `npm audit` en CI, mises à jour régulières, versions épinglées.
- **Sauvegardes** documentées : base (dump quotidien + test de restauration), fichiers (réplication du stockage objet), procédure de reprise (`docs/backup.md`).

---

## 9. Conformité et normes

> Cette section décrit les **mesures techniques**. Elle ne remplace pas l'avis d'un juriste : à faire valider avant la mise en production.

- **Protection des données au Cameroun** : la **loi n° 2024/017 du 23 décembre 2024** relative à la protection des données à caractère personnel est entrée en vigueur le **23 juin 2026** (moratoire de 18 mois), avec une autorité de protection indépendante. Les sources consultées évoquent : consentement explicite, libre et éclairé ; base légale et transparence ; sécurité ; **notification des violations** ; encadrement des **transferts de données hors du territoire**. À traduire techniquement par :
  - consentements **tracés** (date, source, version du texte) et révocables (§6.7) ;
  - **minimisation** : ne collecter que le nécessaire (téléphone obligatoire, le reste facultatif) ;
  - droits d'accès, de rectification, d'effacement/anonymisation, d'export ;
  - **registre des traitements** (`docs/compliance/registre.md`) et **procédure de notification de violation** (`docs/compliance/violation.md`) ;
  - **durées de conservation** documentées (ex. clients inactifs, journaux) et purge automatique ;
  - **décision d'hébergement documentée** : lieu des serveurs, sous-traitants (hébergeur, CDN, WhatsApp/Meta, e-mail), et base juridique des transferts éventuels hors du Cameroun. **Ne pas choisir l'hébergement sans en informer l'utilisateur** (§15).
- **Pages légales obligatoires et accessibles** : conditions d'utilisation, politique de confidentialité, conditions de vente de chaque boutique (modèle fourni au vendeur), mentions légales, contact. Case d'acceptation à l'inscription, avec **version** du texte enregistrée.
- **WhatsApp** : respecter la politique WhatsApp Business (consentement préalable, modèles approuvés, désinscription). Aucun envoi marketing sans consentement.
- **Paiements** : aucun numéro de carte n'est collecté ni stocké (hors périmètre PCI DSS). Les fournisseurs de paiement d'abonnement gèrent la saisie.
- **Accessibilité : WCAG 2.2 niveau AA** (voir §11.3).
- **Mots de passe** : NIST SP 800-63B (voir §6.1).
- **Monnaie** : XAF, entiers, sans décimale.

---

## 10. Conception de l'interface (design system)

- **Tokens** dans `src/styles/tokens.css`, **aucune couleur hexadécimale** dans les composants. Valeurs clés : primaire `#FF9900`, secondaire/texte `#000026`, accent `#EF765E`, **texte sur l'orange toujours `#000026`** (le blanc n'a pas assez de contraste), lien `#A85400`, fond de l'espace vendeur `#F1F2EE`, surface `#FFFFFF`, bordure `#DCE5DE`, texte secondaire `#53645B`, états succès `#207A49`, alerte `#A86305`, erreur `#C93636`, information `#2563EB`.
- **Police Poppins** pour toute l'application (corps, titres, landing, boutiques).
- **Formes** : cartes blanches, rayon 12 px, ombre légère ; boutons rayon 8 px ; pastilles arrondies. Aucune couleur n'est utilisée seule pour porter un sens (ajouter un libellé ou une icône).
- Personnalisation par boutique : **variables CSS posées sur le conteneur de la boutique**, validées côté serveur, avec contrôle de contraste.
- Documenter dans `docs/design-system.md` : rôle de chaque variable, ajout d'un thème, modification des arrondis, isolation par boutique.

---

## 11. Qualité

### 11.1 Tests prioritaires (obligatoires)

Isolation des boutiques · permissions par rôle · **prix recalculés** (prix falsifié ignoré) · **double soumission** (même clé d'idempotence) · **concurrence de stock** (dernière unité) · CRM sans doublon normal · consentement marketing (aucune campagne sans consentement) · webhook dupliqué · échec WhatsApp (commande conservée) · confirmation rattachée à la bonne commande · paiement partiel · abonnement expiré (restrictions, commandes ouvertes traitables) · modification d'adresse (nouvelle confirmation) · accès au suivi non autorisé · fins de mois (essai) · **limite de 5 photos** (interface, service, base) · **suppression d'un produit déjà commandé refusée (archivage proposé)** · **mot de passe de 7 caractères refusé, 8 accepté, mot de passe courant refusé** · slug réservé refusé et unicité · téléphone invalide pour le pays · liste de villes dépendante du pays · **bouton « Commander sur WhatsApp » désactivé tant que le formulaire est invalide, actif quand il est valide, et commande enregistrée avant l'ouverture de `wa.me`** · **assistant WhatsApp : URL de transfert correctement encodée, variables en liste blanche, aucun appel réseau vers PrestAfrik pendant la discussion** · **e-mails : toutes les variables remplacées, version texte présente, aucun jeton dans les journaux, limitation de débit**.

### 11.2 Parcours Playwright

1. Inscription → connexion (avec « Afficher le mot de passe ») → assistant complet (8 étapes, listes dynamiques, indicatif séparé) → publication.
2. Ajout d'un produit avec 5 photos ; tentative d'une 6ᵉ refusée ; modification ; archivage ; suppression d'un produit jamais commandé.
3. Commande client sur la boutique publique (mobile) → confirmation (lien `wa.me` et mode simulé API) → acceptation vendeur → livraison → encaissement → vérification du CRM et du tableau de bord.
4. Invitation d'un collaborateur et vérification de ses droits.
5. Abonnement : essai, expiration simulée, restrictions.
6. Administration : suspension d'une boutique, consultation des alertes.

### 11.3 Accessibilité (WCAG 2.2 AA)

Structure sémantique (`header`, `nav`, `main`, titres hiérarchisés) · navigation **complète au clavier**, ordre de tabulation logique, **focus visible** · libellés associés à chaque champ, erreurs liées par `aria-describedby`, `aria-invalid`, annonce par `aria-live` · contrastes ≥ 4,5:1 (texte) et 3:1 (composants) · cibles ≥ 24 px (visons 44) · pas de piège au clavier dans les dialogues (focus piégé et restitué) · composants complexes selon les **patterns ARIA APG** (combobox, dialog, tabs, menu) · `prefers-reduced-motion` · textes alternatifs des images · **tests `axe`** dans Playwright sur chaque page clé (zéro violation critique ou sérieuse).

### 11.4 Performance

Budgets mobiles (réseau 4G moyen) : LCP ≤ 2,5 s, CLS < 0,1, INP < 200 ms ; JavaScript initial de la boutique publique le plus léger possible. Lighthouse CI sur landing, boutique publique, formulaire de commande.

### 11.5 Qualité du code

TypeScript `strict`, ESLint (règle contre `any` non justifié), Prettier, commits **Conventional Commits**, revues par petites PR, pas de dette cachée.

### 11.6 Environnements et données

- **Base de test dédiée** (`DATABASE_URL_TEST`) : les tests ne touchent jamais la base de développement. Nettoyage/transactions par test.
- **Seed déterministe, relançable**, 5 boutiques, 10 utilisateurs, **60 produits avec variantes et images d'exemple**, **100 clients**, **180 commandes** couvrant tous les cas (non confirmée, confirmée, adresse à corriger, annulée, livrée, échec de livraison, paiement partiel, produit épuisé, frais à confirmer, essai actif/expiré, abonnement mensuel/annuel), messages simulés, notes CRM, consentements. Données **entièrement fictives** (adresses `example.test`). Jamais de contact réel, jamais d'envoi réel.
- `docker-compose.yml` : PostgreSQL 16 (+ stockage objet local compatible S3 et Redis si retenu).

### 11.7 Intégration continue

Pipeline (GitHub Actions) : installation, `lint`, `typecheck`, `prisma migrate deploy` sur base éphémère + **vérification de dérive** (`migrate diff`), tests Vitest, build, Playwright (matrice de viewports + axe), `npm audit`, analyse de secrets. Échec bloquant.

---

## 12. Documentation à livrer

`README.md` (installation, démarrage, migration, seed, application, worker, tests, build production) · `docs/design-system.md` · `docs/integrations.md` (WhatsApp, e-mail, paiement, stockage, règles officielles vérifiées) · `docs/deployment.md` (hébergement, variables d'environnement, domaines, sauvegardes) · `docs/security.md` · `docs/emails.md` (reprend `PRESTAFRIK-MODELES-EMAILS.md`) · `docs/compliance/*` · `docs/decisions.md` (ADR) · `docs/implementation-status.md` (terminé et testé / terminé non testé / simulé / bloqué par configuration externe / non implémenté). **Ne jamais présenter une fonctionnalité simulée comme prête pour la production.**

---

## 13. Inventaire des maquettes et correspondance avec les routes

Les maquettes sont organisées en **6 pages** (une page = un fichier HTML exporté). Les titres ci-dessous sont ceux **affichés sur le canevas** à la date du brief ; ils peuvent avoir été légèrement modifiés : rapprochez par le contenu. Les tailles sont celles des cadres de l'ordinateur (1280 ou 1440), du téléphone (390) ou de l'e-mail (720).

#### Page « Site PrestAfrik »

| Identifiant | Titre de l'écran sur le canevas | Largeur × hauteur | Route / composant |
|---|---|---|---|
| `Landing` | Landing page | 1440 × 8000 | / |
| `Connexion` | Connexion | 1280 × 830 | /connexion |
| `Inscription` | Inscription | 1280 × 830 | /inscription |

#### Page « Assistant de création »

| Identifiant | Titre de l'écran sur le canevas | Largeur × hauteur | Route / composant |
|---|---|---|---|
| `AssistantE1` | Assistant · 1. Nom | 1280 × 900 | /app/nouvelle-boutique (étape 1) |
| `AssistantE2` | Assistant · 2. Activité | 1280 × 980 | /app/nouvelle-boutique (étape 2) |
| `AssistantE3` | Assistant · 3. Localisation | 1280 × 1206 | /app/nouvelle-boutique (étape 3) |
| `AssistantE4` | Assistant · 4. Coordonnées | 1280 × 1340 | /app/nouvelle-boutique (étape 4) |
| `AssistantE5` | Assistant · 5. Thème | 1280 × 820 | /app/nouvelle-boutique (étape 5) |
| `AssistantE6` | Assistant · 6. Logo et couleurs | 1280 × 980 | /app/nouvelle-boutique (étape 6) |
| `AssistantE7` | Assistant · 7. Premier produit | 1280 × 920 | /app/nouvelle-boutique (étape 7) |
| `AssistantE8` | Assistant · 8. Publication | 1280 × 1020 | /app/nouvelle-boutique (étape 8) |
| `AssistantE9` | Assistant · Boutique publiée | 1280 × 1020 | /app/nouvelle-boutique (écran « Boutique publiée ») |

#### Page « Espace vendeur »

| Identifiant | Titre de l'écran sur le canevas | Largeur × hauteur | Route / composant |
|---|---|---|---|
| `Main` | Accueil vendeur | 1280 × 760 | /app/[storeId] |
| `Commandes` | Commandes | 1280 × 760 | /app/[storeId]/commandes |
| `DetailCommande` | Détail d’une commande | 1280 × 1200 | /app/[storeId]/commandes/[orderId] (sans bouton d'impression) |
| `Produits` | Produits | 1280 × 900 | /app/[storeId]/produits |
| `AjoutProduit` | Ajouter un produit | 1280 × 1430 | /app/[storeId]/produits/nouveau |
| `FormProduit` | Formulaire produit | 1280 × 1280 | /app/[storeId]/produits/[productId] |
| `SupprimerProduit` | Supprimer ou archiver un produit | 1280 × 900 | composant `ConfirmDialog` (deux cas : archiver / supprimer) |
| `ImportCSV` | Import CSV | 1280 × 780 | /app/[storeId]/produits/import |
| `Clients` | Clients | 1280 × 760 | /app/[storeId]/clients |
| `FicheClient` | Fiche client | 1280 × 1260 | /app/[storeId]/clients/[customerId] |
| `Marketing` | Marketing | 1280 × 760 | /app/[storeId]/marketing |
| `Livraison` | Livraison | 1280 × 760 | /app/[storeId]/livraisons |
| `ArgentRecu` | Argent reçu | 1280 × 820 | /app/[storeId]/argent |
| `Maboutique` | Ma boutique | 1280 × 760 | /app/[storeId]/boutique |
| `Pages` | Pages éditoriales : gestion autre pas des pages de la boutique | 1280 × 820 | /app/[storeId]/boutique/pages |
| `WhatsAppLien` | Confirmation WhatsApp (lien wa.me, par défaut) | 1280 × 1540 | /app/[storeId]/boutique/whatsapp |
| `ChatbotConfig` | Assistant WhatsApp de la boutique | 1280 × 2060 | /app/[storeId]/boutique/assistant |
| `Equipe` | Équipe | 1280 × 760 | /app/[storeId]/equipe |
| `Abonnement` | Abonnement | 1280 × 860 | /app/[storeId]/abonnement |

#### Page « Boutique publique (client) »

| Identifiant | Titre de l'écran sur le canevas | Largeur × hauteur | Route / composant |
|---|---|---|---|
| `Boutique` | Boutique publique | 390 × 844 | /boutique/[slug] |
| `BoutiqueChat` | Boutique : assistant WhatsApp | 390 × 980 | /boutique/[slug] (widget de discussion ouvert) |
| `FicheProduit` | Fiche produit | 390 × 844 | /boutique/[slug]/produit/[productSlug] |
| `Panier` | Panier | 390 × 844 | /boutique/[slug]/panier |
| `Commande` | Commande : formulaire incomplet | 390 × 1040 | /boutique/[slug]/commander (formulaire incomplet) |
| `CommandeComplet` | Commande : formulaire complet | 390 × 1040 | /boutique/[slug]/commander (formulaire complet) |
| `ResultatCommandeWa` | Résultat de commande (lien wa.me) | 390 × 844 | /boutique/[slug]/commande/[token] (mode lien wa.me) |
| `ResultatCommande` | Résultat de commande | 390 × 844 | /boutique/[slug]/commande/[token] (mode API) |
| `Suivi` | Suivi de commande | 390 × 844 | /suivi/[token] |

#### Page « Administration »

| Identifiant | Titre de l'écran sur le canevas | Largeur × hauteur | Route / composant |
|---|---|---|---|
| `Admin` | Administration PrestAfrik | 1280 × 900 | /admin |
| `AdminAbonnements` | Administration · Abonnements | 1280 × 900 | /admin/abonnements |
| `AdminMessages` | Administration · Messages échoués | 1280 × 900 | /admin/messages |
| `AdminAlertes` | Administration · Alertes | 1280 × 900 | /admin/alertes |
| `AdminUtilisateurs` | Administration · Utilisateurs | 1280 × 900 | /admin/utilisateurs |

#### Page « E-mails »

| Identifiant | Titre de l'écran sur le canevas | Largeur × hauteur | Route / composant |
|---|---|---|---|
| `EmailE01` | E-mail E01 · Confirmation de l’adresse e-mail (inscription) | 720 × 780 | gabarit d'e-mail `E01` (voir `PRESTAFRIK-MODELES-EMAILS.md`) |
| `EmailE02` | E-mail E02 · Bienvenue (adresse confirmée) | 720 × 840 | gabarit d'e-mail `E02` (voir `PRESTAFRIK-MODELES-EMAILS.md`) |
| `EmailE04` | E-mail E04 · Réinitialisation du mot de passe | 720 × 784 | gabarit d'e-mail `E04` (voir `PRESTAFRIK-MODELES-EMAILS.md`) |
| `EmailE05` | E-mail E05 · Mot de passe modifié (alerte de sécurité) | 720 × 780 | gabarit d'e-mail `E05` (voir `PRESTAFRIK-MODELES-EMAILS.md`) |
| `EmailE09` | E-mail E09 · Invitation à rejoindre une boutique | 720 × 754 | gabarit d'e-mail `E09` (voir `PRESTAFRIK-MODELES-EMAILS.md`) |
| `EmailE13` | E-mail E13 · Boutique publiée | 720 × 807 | gabarit d'e-mail `E13` (voir `PRESTAFRIK-MODELES-EMAILS.md`) |
| `EmailE14` | E-mail E14 · Votre essai se termine bientôt | 720 × 855 | gabarit d'e-mail `E14` (voir `PRESTAFRIK-MODELES-EMAILS.md`) |
| `EmailE16` | E-mail E16 · Paiement confirmé | 720 × 818 | gabarit d'e-mail `E16` (voir `PRESTAFRIK-MODELES-EMAILS.md`) |

*Non maquettés, à concevoir dans le même style, en respectant le design system :* pages légales, Mon compte (nom, mot de passe, sessions ouvertes), fenêtre de partage de la boutique (lien, QR, message), page « Mot de passe oublié » et « Nouveau mot de passe », états vide/chargement/erreur de chaque liste, journal d'audit d'administration, configuration de l'API WhatsApp (§6.8), les 17 modèles d'e-mails non dessinés (voir `PRESTAFRIK-MODELES-EMAILS.md`).

---

## 14. Plan d'exécution

**Étape 0 — Prise en main des maquettes** : appliquer le §0.2 en entier (repérer le dossier, ouvrir les 6 pages avec Playwright, isoler les écrans, produire `docs/design/reference/`, `docs/design/INVENTAIRE.md`, lister les ressources manquantes et les demander). **Aucun code d'interface avant la fin de cette étape.**

**Étape 1 bis — Reprise et ajustements** : appliquer A1 à A10 (§3.3), vérifier la migration (§3.2), base de test, CI, en-têtes de sécurité, limitation de débit, Poppins, textes, `PasswordInput`, `PhoneInput`, `Combobox`, composants UI de base. Pages d'authentification conformes aux maquettes (`Connexion`, `Inscription`, récupération).

**Étape 2 — Boutique, catalogue, assistant** : assistant (8 étapes + publication), `Store` étendu, listes géographiques et activités, CRUD produits avec 5 images, catégories, import/export CSV, boutique publique (`/boutique/[slug]`), thèmes, personnalisation, pages éditoriales, QR code et partage.

**Étape 3 — Panier, commandes, CRM, stock** : formulaire de commande, transaction + outbox + idempotence, machine d'états, réservation de stock, doublons, suivi, clients et consentements, détail de commande.

**Étape 4 — WhatsApp** : mode lien `wa.me`, interface `MessagingProvider`, adaptateur simulé, worker, mode API, webhooks, journal, alertes.

**Étape 5 — Livraison, argent, tableau de bord** : zones, livreurs, paiements (journal), statistiques, accueil vendeur.

**Étape 6 — Abonnements et administration** : plans, quotas, calcul calendaire, restrictions, adaptateur de paiement, pages d'administration.

**Étape 7 — Marketing, innovations sans IA, import/export** : campagnes, QR code de produit, réachat, rappels, détection de doublons, favoris locaux.

**Étape 8 — Finalisation** : tests complets, sécurité, accessibilité, performance, landing page finale, documentation, déploiement.

À la fin de **chaque** étape : résumé de ce qui est terminé, résultats des tests, comment tester, mise à jour de `docs/implementation-status.md`.

---

## 15. Décisions et informations à demander à l'utilisateur (bloquantes uniquement)

1. **Dossier des maquettes** : confirmer le dossier du dépôt qui contient les exports HTML (§0.2) s'il y a un doute, et fournir les **ressources manquantes** (logo PrestAfrik en PNG, silhouette de l'Afrique).
2. **Hébergement** : type (partagé / Cloud / VPS), pays des serveurs — impacte les sous-domaines et la conformité (§9). Tant qu'il n'est pas choisi : développement local + `docker-compose`, adresses en `/boutique/[slug]`.
3. **Secrets externes** (au moment venu, jamais dans le dépôt) : compte WhatsApp Business (étape 4), prestataire de paiement d'abonnement (étape 6), serveur SMTP (étape 1 bis/8), stockage objet.
4. **Quotas des offres** (produits, messages, membres) pour Essentiel, Business, Pro.
5. **Textes légaux** (conditions, confidentialité, conditions de vente) à fournir ou valider.
6. **Coordonnées de contact** affichées sur la landing page (e-mail, WhatsApp).

Tout le reste : décidez raisonnablement, documentez dans `docs/decisions.md`, et continuez.

---

*Fin du brief. Rappel : respecter les maquettes, être irréprochable en responsive, tout rendre fonctionnel, ne jamais présenter du simulé comme réel.*
