# Audit SEO · GEO · AEO de PrestAfrik

*Audit du 6 novembre 2026. Grille et barème : SNLabat/SEO-GEO-AEO-Skill (étapes 3 et 4), lus en ligne sans être installés dans le projet. Sources : le HTML renvoyé par le serveur, récupéré sans JavaScript, et le code du dépôt (commit `1e75f30`).*

---

## 1. Résumé

PrestAfrik a de bonnes bases techniques : chaque page du site vitrine est rendue côté serveur, a un titre, une description et une canonique. La page d'accueil porte des données structurées `Organization`, `WebSite` et `FAQPage`. Le gros point faible est la **marketplace** (`shop.prestafrik.com`) : c'est elle qui doit devenir l'accueil, et elle n'a ni H1, ni données structurées, ni texte `alt` sur ses 120 images. Ses pages de recherche et de catégorie reprennent en plus la description par défaut du site. La marque est **presque invisible en dehors du site** : une recherche web « PrestAfrik » ne renvoie aucun résultat PrestAfrik. Pour les moteurs IA, il manque un `llms.txt`, une page À propos qui inspire confiance (personnes, date, chiffres réels) et un accès garanti pour GPTBot, qui reçoit une erreur 429. Les textes contiennent encore la mention « gratuit » sans réserve, ce que le brief interdit. Elle figure notamment dans le titre de l'accueil.

| Dimension | Note |
|---|---|
| SEO | **5 / 10** : bonnes fondations, manques importants sur la marketplace |
| GEO | **4 / 10** : identité déclarée, mais peu de signaux de confiance et de contenu citable |
| AEO | **4 / 10** : une FAQ balisée, pas de guides pas à pas ni de réponses courtes sous des questions |
| **Total** | **13 / 30** |

---

## 2. Pages et routes auditées

| Page | URL | Fichier |
|---|---|---|
| Accueil (landing vendeurs) | https://prestafrik.com/ | `src/app/page.tsx` |
| À propos | /a-propos | `src/app/a-propos/page.tsx` |
| Contact | /contact | `src/app/contact/page.tsx` |
| Démo | /demo | `src/app/demo/page.tsx` |
| Tarifs | /tarifs | `src/app/tarifs/page.tsx` |
| Fonctionnalités | /fonctionnalites | `src/app/fonctionnalites/page.tsx` |
| Centre d'aide | /aide | `src/app/aide/page.tsx` |
| Blog | /blog | `src/app/blog/…` |
| Rechercher un vendeur | /recherche, /recherche?q=robe | `src/app/recherche/page.tsx` |
| Connexion, inscription | /connexion, /inscription | `src/app/connexion`, `src/app/inscription` |
| Marketplace : accueil | https://shop.prestafrik.com/ | `src/app/nos-boutiques/page.tsx` |
| Marketplace : recherche et catégorie | shop…/recherche?q=robe, ?categorie=vetements-mode | `src/app/nos-boutiques/recherche/page.tsx` |
| Boutique | https://golden-needle.prestafrik.com/ et https://prestafrik.com/golden-needle | `src/app/[slug]/page.tsx`, `layout.tsx` |
| Produit | https://golden-needle.prestafrik.com/robe-africaine | `src/app/[slug]/[productSlug]/page.tsx` |
| Espace connecté | https://app.prestafrik.com/connexion | `src/proxy.ts` |
| Fichiers pour les robots | /robots.txt, /sitemap.xml, /llms.txt | `src/app/robots.ts`, `src/app/sitemap.ts` |

---

## 3. Constats par dimension

Statuts : ✅ conforme · ⚠️ à améliorer · ❌ manquant ou bloquant.

### 3.1 SEO

| Signal | Constat | Statut |
|---|---|---|
| Rendu serveur | Toutes les pages, y compris boutiques et produits, arrivent complètes dans le HTML (H1, produits, prix). Les robots IA peuvent les lire. | ✅ |
| Langue | `<html lang="fr">` partout ; Open Graph en `fr_FR` (le brief demande `fr_CM`). `src/app/layout.tsx` | ⚠️ |
| Titre de l'accueil | « PrestAfrik : créez votre boutique en ligne gratuite et vendez sur WhatsApp » (74 caractères, coupé dans Google). Il parle aux vendeurs, pas de marketplace, et contient « gratuite ». | ⚠️ |
| Description de l'accueil | 212 caractères : trop longue (150 à 160 attendus) et dit « gratuitement ». | ⚠️ |
| H1 de l'accueil | « Votre commerce mérite une vitrine à sa hauteur » : ni « PrestAfrik » ni « marketplace ». | ⚠️ |
| H1 de la marketplace | **Aucun H1** sur shop.prestafrik.com, ni sur ses pages de recherche et de catégorie. `src/app/nos-boutiques/page.tsx` | ❌ |
| Descriptions de la marketplace | Recherche et catégories : description par défaut du site vitrine (« créez gratuitement votre boutique… »), sans rapport avec la page. | ❌ |
| Titres des pages du site | À propos, Contact, Démo, Fonctionnalités, Blog : titres très courts (17 à 28 caractères) du type « Démo · PrestAfrik », sans mot-clé. | ⚠️ |
| Canonique | Présente sur les pages du site, les boutiques et les produits. Absente sur /connexion, /inscription et /recherche?q=… | ⚠️ |
| Doublon boutique | `prestafrik.com/golden-needle` répond 200 avec la même page que `golden-needle.prestafrik.com` (canonique vers le sous-domaine, noindex). Il faudrait une redirection 301. | ⚠️ |
| Pages à exclure de l'index | /connexion et /inscription sont indexables (`index, follow`). Sur app.prestafrik.com, l'en-tête dit `noindex` mais la balise dit `index` : messages contradictoires. | ❌ |
| Recherche interne | `/recherche?q=robe` est indexable et sans canonique. Le brief demande `noindex, follow`. Sur la marketplace, les recherches sont déjà en noindex. | ⚠️ |
| robots.txt | Bloque l'API, l'espace vendeur et l'administration, et pointe vers le sitemap. Aucune règle pour /connexion et /inscription, ni pour les robots IA. | ⚠️ |
| Sitemap | 27 adresses : site, blog, accueil et catégories de la marketplace. Boutiques et produits retirés le 6 novembre (commit `1e75f30`, à votre demande), ce qui contredit l'étape A du brief (voir 4.1). Pas de `lastModified` sur les pages fixes. | ⚠️ |
| Texte `alt` | Marketplace : **119 images sur 120 ont un `alt` vide**, y compris les photos de produits et les logos (`src/components/shop/product-card.tsx:19`, `shop-blocks.tsx:70,96`). Accueil : 35 sur 56 vides, des images surtout décoratives (à vérifier une à une). | ❌ |
| `next/image` | Utilisé sur le site vitrine et les boutiques. La marketplace utilise de simples `<img>` déjà converties en WebP 320 px, avec dimensions et chargement différé : acceptable, mais sans `srcset`. | ⚠️ |
| Poids du HTML | Accueil de la marketplace : 296 ko de HTML et 120 images ; accueil d'une grosse boutique : 398 ko. À surveiller en 3G. | ⚠️ |
| Open Graph | Image définie partout. `og:url` absent sur la plupart des pages du site et de la marketplace ; titres OG des boutiques réduits au nom (« Golden Needle »). | ⚠️ |
| Description produit | Quand le vendeur n'a rien écrit, la page invente « Robe Africaine à 10 000 FCFA chez Golden Needle… » : contenu pauvre (149 mots sur la page). | ⚠️ |
| Redirections de domaine | `www.` et `http://` redirigent en 301 vers https://prestafrik.com/. `/nos-boutiques` redirige en 308 vers shop.prestafrik.com. | ✅ |

### 3.2 GEO (moteurs IA)

| Signal | Constat | Statut |
|---|---|---|
| Organization et sameAs | Sur l'accueil : nom, autres noms, logo, description, pays CEMAC, contacts, TikTok, Facebook, chaîne WhatsApp, YouTube et marketplace. Le numéro de support WhatsApp du brief (+237 671 08 31 42) n'y figure pas : ce sont les numéros de `src/config/site.ts`. | ⚠️ |
| Phrase d'identité | Le positionnement « marketplace camerounaise qui met en relation vendeurs et clients sur WhatsApp » n'apparaît nulle part. Le site se présente encore comme un outil de création de boutique. | ❌ |
| Page À propos | 430 mots : mission et valeurs, mais aucune personne nommée, ni date de lancement (24 octobre 2026), ni chiffres réels, ni JSON-LD `AboutPage`. Signaux de confiance faibles. | ❌ |
| Contact | Formulaire, e-mail et téléphones accessibles. | ✅ |
| llms.txt | Absent (404). | ❌ |
| Accès des robots IA | Avec leur nom de robot : OAI-SearchBot, ClaudeBot et PerplexityBot reçoivent 200, **GPTBot reçoit 429** (trop de requêtes) au premier essai. Un faux Googlebot ou Bingbot reçoit 403 : c'est normal si l'hébergeur vérifie l'adresse des robots, mais c'est à confirmer dans Hostinger. | ⚠️ |
| Données structurées de la marketplace | Aucun JSON-LD : ni `ItemList`, ni `BreadcrumbList`, ni `CollectionPage`. | ❌ |
| Données structurées boutique et produit | `Store` (nom, logo, ville, paiement à la livraison) et `Product` + `Offer` en XAF, avec disponibilité, vendeur et `AggregateRating` réel. Pas de `BreadcrumbList`, pas de région ni de pays. | ⚠️ |
| Contenu citable | Peu de faits : aucun chiffre réel, pas de date, pas de comparaison, pas de guide en étapes numérotées. | ❌ |
| Notoriété hors site | Une recherche web « PrestAfrik » (moteur de recherche web de l'outil, pas Google lui-même) ne renvoie **aucun résultat PrestAfrik**. La marque n'est pas encore connue des index. | ❌ |
| HTTPS | Partout, avec redirection depuis http. | ✅ |

### 3.3 AEO (extraits, voix)

| Signal | Constat | Statut |
|---|---|---|
| FAQ | FAQ sur l'accueil, balisée `FAQPage`. Les réponses sont dans le HTML même quand le tiroir est fermé. Le centre d'aide contient des questions-réponses, mais sans `FAQPage`. | ⚠️ |
| Questions côté acheteur | Aucune question pour l'acheteur (« Comment acheter sur PrestAfrik ? », « Le paiement se fait-il vraiment à la livraison ? »…) : toute la FAQ s'adresse au vendeur. | ❌ |
| Guides pas à pas | Pas de « Créer sa boutique en 5 étapes » ni de « Commander sur WhatsApp » en liste numérotée. | ❌ |
| Titres en questions | Rares en dehors de la FAQ. | ⚠️ |
| Signaux locaux | Ville affichée sur les boutiques et dans `Store.address`. Pas de pages ville (« Boutiques à Douala »). | ⚠️ |
| Mention « gratuit » | Accueil (titre et description), À propos et descriptions par défaut : « gratuit » sans réserve, interdit par le brief (§1). | ❌ |

---

## 4. Matrice de priorités

| Priorité | Problème | Dimension | Effort | Impact |
|---|---|---|---|---|
| Critique | Décider de l'architecture des URL : boutiques sur `/boutique/[slug]` ou sur sous-domaines, et indexées ou non (voir 4.1) | SEO | Élevé | Très fort |
| Critique | Marketplace en accueil de prestafrik.com, `shop.` redirigé en 301 URL par URL (étape 0) | SEO | Élevé | Très fort |
| Critique | H1 « PrestAfrik, la marketplace… » et titre de l'accueil commençant par la marque | SEO | Faible | Fort |
| Critique | Retirer « gratuit » sans réserve des titres, descriptions et textes | GEO | Faible | Fort (conformité) |
| Haute | `alt` = nom du produit ou de la boutique sur toutes les images de la marketplace | SEO | Faible | Fort |
| Haute | `noindex` sur /connexion, /inscription et /recherche?q= ; balise et en-tête cohérents sur app.prestafrik.com | SEO | Faible | Moyen |
| Haute | Descriptions propres aux pages de catégorie et de recherche de la marketplace | SEO | Faible | Moyen |
| Haute | Vérifier dans Hostinger que GPTBot et Bingbot ne sont pas bloqués ou limités ; règles explicites pour les robots IA dans robots.txt | GEO | Faible | Fort |
| Haute | `llms.txt` et phrase d'identité cohérente partout | GEO | Faible | Fort |
| Haute | Page À propos renforcée : qui porte le projet, date de lancement, chiffres réels tirés de la base | GEO | Moyen | Fort |
| Moyenne | `BreadcrumbList` partout ; région et pays dans `Store` ; `ItemList` sur la marketplace | GEO | Moyen | Moyen |
| Moyenne | FAQ acheteurs (réponses de 40 à 60 mots) et guides en étapes numérotées | AEO | Moyen | Moyen |
| Moyenne | Images Open Graph dynamiques (`opengraph-image.tsx`) pour boutiques et produits ; `og:url` et `fr_CM` | SEO | Moyen | Moyen |
| Moyenne | Pages ville et catégorie, indexées au-delà d'un seuil de boutiques | SEO / AEO | Élevé | Fort |
| Gain rapide | Redirection 301 de `prestafrik.com/[boutique]` vers l'adresse canonique | SEO | Faible | Faible |
| Gain rapide | Titres plus parlants pour À propos, Contact, Démo, Fonctionnalités, Blog | SEO | Faible | Moyen |
| Gain rapide | `FAQPage` sur le centre d'aide | AEO | Faible | Faible |

### 4.1 Décisions à prendre avant la phase 2

1. **Indexation des boutiques.** Le 6 novembre, à votre demande, les boutiques publiques ont été passées en `noindex` et retirées du sitemap (commit `1e75f30`). Le brief demande au contraire un sitemap avec les « boutiques actives et produits en ligne », plus des métadonnées et du JSON-LD pour chacune. **Quelle règle garde-t-on ?**
2. **Adresse des boutiques.** Le brief dit que « les sous-domaines par boutique restent abandonnés » et place les boutiques sur `prestafrik.com/boutique/[slug]`. Or, en production, elles sont **servies sur des sous-domaines** (`golden-needle.prestafrik.com`, ADR-024) et aussi sur `prestafrik.com/[slug]`. Basculer vers `/boutique/[slug]` impose une redirection 301 pour chaque sous-domaine et pour chaque lien déjà partagé sur WhatsApp. **Confirmez-vous ce changement ?** Le nom `boutique` est déjà réservé (`src/modules/stores/slug.ts:8`) : aucun vendeur ne peut le prendre.
3. **Numéro de support.** Faut-il utiliser +237 671 08 31 42 (brief) à la place des numéros actuels de `src/config/site.ts` ?
4. **Seuil des pages ville et catégorie.** Proposition : indexer une page à partir de 3 boutiques actives ayant au moins un produit visible.
5. **Service de modération d'images** : choix ci-dessous.

### 4.2 Modération d'images : comparatif des services

Conversion indicative : 1 USD ≈ 600 FCFA. Prix publics relevés le 6 novembre 2026.

| Service | Ce qu'il détecte | Gratuit | Ensuite | Coût par image |
|---|---|---|---|---|
| **Google Cloud Vision (SafeSearch)** | adulte, suggestif, violence, médical, parodie (5 niveaux de probabilité) | 1 000 images / mois, sans limite de durée | 1,50 $ les 1 000 | **≈ 0,9 FCFA** |
| **Amazon Rekognition (DetectModerationLabels)** | nudité, suggestif, violence, contenu choquant ou gore, drogues, symboles haineux, avec score de confiance | 1 000 images / mois, **12 premiers mois seulement** | 1,00 $ les 1 000 | **≈ 0,6 FCFA** |
| **Sightengine** | nudité très détaillée, gore, armes, gestes offensants, etc. (un « modèle » = une opération) | 2 000 opérations / mois (500 par jour) | 29 $ / mois pour 10 000 opérations | **≈ 3,5 à 5 FCFA** (2 à 3 modèles par image) |

**Recommandation : Google Cloud Vision.** Il est simple à brancher (une clé d'API, un seul appel HTTP), son quota gratuit de 1 000 images par mois est permanent, il couvre à la fois le sexuel et le violent, et ses niveaux de probabilité correspondent directement aux trois issues du brief : accepter, refuser, mettre en attente. Rekognition est un peu moins cher, mais sa gratuité s'arrête après 12 mois et l'authentification AWS est plus lourde. Sightengine est le plus fin sur le gore, mais coûte 4 à 6 fois plus cher. Dans tous les cas, l'appel sera isolé derrière une interface `ImageModerationService`.

---

## 5. Ce qui fonctionne déjà bien

- **Rendu serveur complet** des boutiques, produits et pages du site : rien n'est caché derrière du JavaScript.
- **Données structurées produit propres** : `Product` + `Offer` en XAF, disponibilité, vendeur et note issue de vrais avis.
- **Accueil** : `Organization` complète (autres noms, contacts, réseaux sociaux, pays) et `WebSite`.
- **Une seule canonique** par page de contenu ; `www` et `http` redirigés en 301.
- **Espaces privés** (tableau de bord, administration, API) bloqués dans robots.txt ; recherches sans résultat et pages de panier, commande et suivi en `noindex`.
- **Noms réservés** : `boutique`, `boutiques`, `shop`, `aide`… ne peuvent pas devenir des adresses de boutique.
- **Images des boutiques et produits** : WebP, `next/image` et dimensions fixées (peu de décalage de mise en page).

---

## 6. Ce que le code ne permet pas de mesurer

| Mesure | Outil |
|---|---|
| Core Web Vitals réels (LCP, CLS, INP sur mobile) | PageSpeed Insights, rapport « Signaux Web essentiels » de la Search Console |
| Ce que Google affiche pour « PrestAfrik », positions, clics | Google Search Console → Performances (l'outil de recherche utilisé ici n'interroge pas Google) |
| URL indexées et exclues | Search Console → Pages ; Bing Webmaster Tools |
| Backlinks et mentions de la marque | Search Console → Liens ; Ahrefs Webmaster Tools (gratuit) |
| Accès réel des robots (blocages de l'hébergeur) | Journaux d'accès Hostinger, réglages anti-robots du pare-feu |
| Validité des résultats enrichis | Test des résultats enrichis de Google, validateur schema.org |
| Citations par les moteurs IA | Tests manuels dans ChatGPT Search, Perplexity et Gemini (« Qu'est-ce que PrestAfrik ? ») |
