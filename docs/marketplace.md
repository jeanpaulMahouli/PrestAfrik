# Marketplace : recherche de vendeurs (première brique)

## En place

- Barre « Rechercher un vendeur, une boutique ou une ville » dans le héros de l'accueil, suggestions dès
  2 caractères (250 ms), navigation clavier (↑ ↓ Entrée Échap) et toucher, texte saisi mis en évidence.
- Page `/recherche?q=…` rendue côté serveur : cartes boutique (logo, nom, description sur 2 lignes, ville et
  pays, 4 produits, « Découvrir la boutique »), filtres ville et activité, « Voir plus » (8 par 8), état vide
  avec suggestions et appel aux vendeurs. Les pages sans résultat sont en `noindex`.
- `GET /api/recherche?q=` : Zod (2 à 60 caractères, caractères de contrôle et chevrons retirés), 60 requêtes
  par minute et par IP, **boutiques publiées et non suspendues seulement**, aucun téléphone, e-mail ni donnée
  client.
- Données structurées `WebSite` + `SearchAction` vers `/recherche?q=`.

Code : `src/modules/marketplace/search.ts`, `src/components/marketplace/vendor-search.tsx`,
`src/app/recherche/page.tsx`, `src/app/api/recherche/route.ts`.

## Recherche insensible aux accents : choix technique

Avec ~500 boutiques, la liste publique (champs publics) est lue au plus une fois par minute et filtrée en
mémoire après normalisation (« Yaoundé » = « yaounde »). Aucune extension PostgreSQL ni migration.
Au-delà de quelques milliers de boutiques : remplacer `loadIndex()` par une requête SQL avec les extensions
`unaccent` et `pg_trgm` et un index GIN, sans changer les fonctions exportées.

## Points d'extension (rien n'est en production)

| Besoin futur | Où le brancher |
| --- | --- |
| Classement par avis positifs | `relevanceScore()` : ajouter un bonus selon la note moyenne de la boutique. |
| Boost payant | Même fonction : bonus d'une offre active ; **chaque résultat boosté doit porter l'étiquette « Sponsorisé »** sur sa carte (`StoreCard`). |
| Emplacement « Mis en avant » | En tête de `/recherche`, une rangée séparée alimentée par les boosts, étiquetée « Sponsorisé ». |
| Produits mis en avant d'une boutique | `getTopProducts(storeId)` : seule fonction à faire évoluer (ventes, boost produit…). |

## Données disponibles et manquantes

- **Avis produits** : le modèle `ProductReview` existe (note 1 à 5, modération `APPROVED`). `getTopProducts`
  prend les mieux notés parmi les avis approuvés, puis les plus récents ; un produit sans avis n'a **aucune**
  note affichée.
- **Manquants pour un vrai classement** : note moyenne par boutique (à calculer), nombre de ventes validées par
  produit exposé publiquement (décision à prendre), modèle d'offre de boost (durée, emplacement, prix).
