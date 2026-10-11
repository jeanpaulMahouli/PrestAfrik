# Système de design PrestAfrik

## Référence visuelle

Les couleurs et proportions sont calées sur les maquettes UX/UI du dépôt : fond gris-vert pâle, surfaces blanches, texte bleu nuit, bordures discrètes et appels à l’action orange. Le logo fourni est servi depuis `public/logo-prestafrik.png`.

## Tokens globaux

Les valeurs partagées sont définies dans `src/styles/tokens.css` et chargées par `src/app/globals.css`.

| Variable | Rôle |
| --- | --- |
| `--color-brand-primary` | Boutons et actions principales orange. |
| `--color-brand-secondary` | Panneau bleu nuit des écrans d’authentification. |
| `--color-brand-accent` | Accent secondaire, notamment dans les futurs thèmes de boutique. |
| `--color-page-background` | Fond général de l’espace vendeur. |
| `--color-surface`, `--color-surface-muted` | Cartes et surfaces secondaires. |
| `--color-text-primary`, `--color-text-secondary` | Texte principal et texte d’accompagnement. |
| `--color-border`, `--color-link` | Séparateurs et liens. |
| `--color-success`, `--color-warning`, `--color-danger`, `--color-info` | États sémantiques. |
| `--color-on-primary`, `--color-on-secondary` | Texte posé sur les couleurs de marque. |
| `--radius-sm`, `--radius-md`, `--radius-lg` | Arrondis des contrôles et des cartes. |
| `--shadow-card` | Ombre légère des surfaces. |
| `--spacing-page-mobile`, `--spacing-page-desktop` | Repères d’espacement par taille d’écran. |
| `--font-body`, `--font-heading` | Familles de polices de l’application. |

Les couleurs de texte sur les boutons sont choisies pour conserver un fort contraste avec les fonds orange et bleu nuit. Vérifie le contraste à chaque changement de palette, en particulier pour le texte secondaire et les états pâles.

## Modifier le style global

Modifie les valeurs dans le bloc `:root` de `src/styles/tokens.css`. Les alias Tailwind sont regroupés dans `@theme inline` ; utilise ces alias ou les variables sémantiques plutôt que d’ajouter des couleurs hexadécimales dans les composants.

Les rayons et ombres se règlent au même endroit. Les espacements de page principaux et les adaptations mobiles sont dans `src/app/globals.css`.

## Préserver l’identité des boutiques

La palette PrestAfrik est globale. Les personnalisations de boutique devront être appliquées sur un conteneur de vitrine dédié à partir de variables CSS validées côté serveur (couleurs hexadécimales contrôlées, calcul du contraste). Ne modifie pas `:root` depuis les réglages d’une boutique : cela changerait l’interface de toute la plateforme. Les thèmes doivent partager les mêmes composants métier et ne modifier que leur rendu.

Les trois thèmes enregistrés sont `CATALOGUE_EXPRESS`, `MODE_BEAUTE` et `BOUTIQUE_MARQUE`. Le tableau de bord reprend la hiérarchie des maquettes : barre supérieure, navigation latérale, cartes récapitulatives issues de la base et panneaux d’actions, avec adaptations dédiées aux tablettes et téléphones. Les pages de gestion de la boutique et du catalogue utilisent une grille responsive alignée sur les maquettes, avec aperçu latéral, cartes de thème, filtres et tableau produits.

La vitrine publique reprend l’en-tête de boutique, la recherche, le défilement des catégories, le bandeau de livraison et la grille de produits ; elle passe à deux colonnes sur mobile et garde l’accès au panier fixé en bas de l’écran.

Le catalogue public est mis en cache pendant 60 secondes. Les actions de publication, d’apparence et de catalogue invalident immédiatement les entrées concernées. Les prix et la disponibilité réelle restent revalidés sur le serveur lors du panier et du checkout.

## Rôles dans l’espace vendeur

- **Propriétaire** : produits, commandes, clients, paiements, livraisons, marketing, équipe, boutique et abonnement.
- **Gestionnaire** : gestion quotidienne des produits, commandes, clients, paiements, livraisons, marketing et boutique ; pas de gestion de l’équipe ni de l’abonnement.
- **Préparateur de commandes** : consultation des produits et commandes, et préparation des commandes uniquement.

La matrice est définie dans `src/modules/auth/permissions.ts` et testée dans `tests/permissions.test.ts`.
