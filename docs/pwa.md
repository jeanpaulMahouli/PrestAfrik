# Application installable (PWA) et accès des vendeurs à leur boutique

## Ce qui est en place

| Élément | Où |
| --- | --- |
| Manifeste (nom, icônes, couleurs, raccourcis) | `public/manifest.webmanifest` |
| Icônes 192, 512 et « maskable » | `public/brand/pwa/` (générées depuis `public/brand/icon.png`) |
| Service worker minimal (aucun cache, aucune interception) | `public/sw.js`, enregistré par `PwaRegistration` (production seulement) |
| Déclaration Next.js (`manifest`, `appleWebApp`, `themeColor`) | `src/app/layout.tsx` ; retiré des boutiques dans `src/app/[slug]/layout.tsx` |
| Bouton « Installer PrestAfrik sur mon écran d'accueil » | `src/components/pwa/install-app.tsx` |

- **Android / Chrome / Edge** : la fenêtre d'installation native du navigateur (`beforeinstallprompt`).
- **iPhone / iPad** : Apple ne propose pas de fenêtre ; une explication en 3 étapes (Partager → « Sur l'écran
  d'accueil » → Ajouter), avec un rappel d'ouvrir Safari si le vendeur utilise Chrome sur iPhone.
- **Autres navigateurs Android** : les étapes du menu ⋮.
- Le bouton disparaît quand l'application est déjà installée (mode `standalone`).

Où le vendeur le voit :
1. juste après la création de sa boutique (fenêtre une seule fois sur l'appareil, « Recommandé, mais facultatif ») ;
2. sur l'accueil du tableau de bord (encart qu'il peut masquer) ;
3. toujours dans le menu de son compte (« Installer l'application »).

Le service worker ne met rien en cache : le cache HTTP, celui de Cloudflare et celui de Next.js restent
exactement les mêmes.

## Comment chaque vendeur retrouve sa boutique (sans complexifier)

Deux portes, chacune avec un seul rôle :

| Pour qui | Quoi | Comment on y arrive |
| --- | --- | --- |
| Le vendeur | **L'application PrestAfrik** : gérer commandes, produits, clients | Icône PrestAfrik sur l'écran d'accueil → ouvre `/dashboard` sur sa boutique (la dernière utilisée est retenue sur le compte). Appui long sur l'icône (Android) : Commandes, Ajouter un produit, Ma boutique. |
| Ses clients | **La boutique publique** : voir et commander | Le lien `mboa-style.prestafrik.com` (ou `prestafrik.com/mboa-style`), le QR code et le bouton « Partager » du tableau de bord. |

Choix volontaires :
- **Une seule application pour tous les vendeurs** (pas une par boutique) : un vendeur avec plusieurs boutiques
  passe de l'une à l'autre dans l'en-tête, comme aujourd'hui.
- **Les boutiques publiques ne proposent pas d'installer l'espace vendeur** : le manifeste est retiré de leurs
  pages, pour qu'un client n'installe jamais le tableau de bord par erreur.
- **« Voir ma boutique »** reste à un geste depuis le tableau de bord (bouton Partager, lien de la boutique).

## Pistes, plus tard

- Manifeste par boutique (nom et logo de la boutique, `start_url` = la boutique) pour que les **clients**
  ajoutent une boutique à leur écran d'accueil. Demande un manifeste dynamique par sous-domaine : à faire
  seulement si les vendeurs le demandent.
- Notifications de nouvelles commandes (Web Push) : nécessite un service worker avec gestion des messages et
  le consentement du vendeur ; à étudier séparément.
