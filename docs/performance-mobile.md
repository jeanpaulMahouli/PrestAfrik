# Audit du chargement sur mobile (30 octobre 2026)

Mesures Lighthouse 12.6, profil mobile (4G lente simulée, processeur ralenti ×4), sur le site en ligne
**avant** le déploiement des correctifs ci-dessous. Le cache existant (Cloudflare, en-têtes, Next.js) n'a pas
été modifié.

| Page | Score | Premier affichage (FCP) | Plus grand élément (LCP) | Blocage (TBT) | Poids |
| --- | --- | --- | --- | --- | --- |
| Accueil `prestafrik.com` | 69 | 1,1 s | 3,4 s | 640 ms | 578 Ko |
| Connexion | 84 | 2,6 s | 2,8 s | 270 ms | 319 Ko |
| Boutique (`bestshop.prestafrik.com`) | 77 | 3,4 s | 4,0 s | 190 ms | 352 Ko |

Temps de réponse réel du serveur (mesuré depuis la France) : 0,3 à 0,8 s pour les pages, Cloudflare en
`DYNAMIC` (pages non mises en cache, ce qui est voulu : elles dépendent de la session).

## Ce qui ralentit

1. **Accueil : animations permanentes** (boutons qui flottent, reflet du bouton principal, défilement des
   logos, éléments flottants du héros). Lighthouse compte 2 s de calcul de style et de mise en page sur un
   téléphone moyen : c'est la première cause du blocage (TBT 640 ms).
2. **Accueil : 4 captures d'écran « Côté client »** téléchargées d'emblée alors qu'une seule est visible
   (~140 Ko inutiles au premier chargement).
3. **Boutiques : la photo du premier produit** (élément LCP) était chargée en différé quand la boutique n'a ni
   bannière ni promotion : la priorité allait à la grille « Tous nos produits », plus bas.
4. **JavaScript** : ~3,6 s d'exécution sur la boutique (téléphone ralenti), dont une partie inutilisée au
   premier affichage (assistant de discussion, panier, fenêtre promotionnelle).

## Corrigé dans ce lot (sans toucher au cache)

- Captures « Côté client » : seules l'étape affichée et la suivante sont téléchargées
  (`components/landing/client-showcase.tsx`).
- Boutiques : les 4 premières photos de la **première grille visible** sont prioritaires
  (`app/[slug]/page.tsx`).
- Recherche de vendeurs : suggestions mises en cache 30 s par le navigateur, liste des boutiques gardée 1 min
  en mémoire ; preuve sociale gardée 10 min.

À mesurer de nouveau après le déploiement (même commande, même profil) pour le tableau avant/après.

## Corrections simples proposées (non faites, à valider)

| Proposition | Gain attendu | Effort |
| --- | --- | --- |
| Arrêter les animations infinies sur téléphone (`lp-bob`, `lp-shimmer`, éléments flottants) : garder une seule apparition à l'arrivée | TBT de l'accueil divisé par 2 environ | 30 min, CSS seulement |
| Charger l'assistant de discussion et la fenêtre promotionnelle des boutiques après le premier affichage (`next/dynamic`, `ssr: false`) | −0,5 à −1 s d'exécution JS sur mobile | 1 h |
| Fond du héros (dégradés et colonnes décoratives) en une seule image légère au lieu de plusieurs couches | Moins de calcul de rendu | 1 h |
| Rendre l'accueil statique et détecter la session côté navigateur (bouton « Mon espace ») | Accueil servi par Cloudflare en quelques ms | 2 h, **modifie la mise en cache : à décider** |

Objectif du brief (Lighthouse mobile ≥ 90 sur l'accueil) : non atteint tant que les animations permanentes
restent ; la première proposition est la plus rentable.
