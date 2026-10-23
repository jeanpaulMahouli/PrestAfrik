# Boutiques en sous-domaine : mboa-style.prestafrik.com

Chaque boutique est servie à `{adresse}.prestafrik.com`. L'ancienne adresse `prestafrik.com/{adresse}`
continue de fonctionner (liens WhatsApp, QR codes déjà imprimés). Décision : ADR-024.

## Fonctionnement

```
Navigateur ── mboa-style.prestafrik.com/panier
   │  DNS Cloudflare : * → proxy Cloudflare (certificat *.prestafrik.com gratuit)
   ▼
Worker Cloudflare (infra/cloudflare/worker-sous-domaines.js)
   │  relaie vers https://prestafrik.com/panier
   │  + x-prestafrik-store-host: mboa-style.prestafrik.com
   │  + x-prestafrik-proxy-key: STORE_PROXY_SECRET
   ▼
Hostinger (application Node.js, seul nom servi : prestafrik.com)
   │  src/proxy.ts vérifie la clé et réécrit en /mboa-style/panier
   ▼
Vitrine de la boutique ; ses liens restent sur le sous-domaine (/panier, /{produit}…)
```

Pourquoi un Worker : l'hébergement Node.js Hostinger ne propose ni sous-domaine joker ni certificat
joker (réservés aux VPS). La réécriture de l'en-tête Host par une règle Cloudflare est réservée à
l'offre Enterprise. Le Worker, lui, est gratuit jusqu'à 100 000 requêtes par jour. Les scripts, styles
et polices sont chargés depuis prestafrik.com et ne comptent pas (`assetPrefix`, next.config.ts).
Au-delà, l'offre Workers Paid coûte 5 $/mois pour 10 millions de requêtes.

Sur un serveur qui reçoit directement `*.prestafrik.com` (VPS), le Worker est inutile : src/proxy.ts
lit aussi l'en-tête Host.

## Variables d'environnement (Hostinger)

| Variable | Valeur |
| --- | --- |
| `FEATURE_SUBDOMAINS` | `true` |
| `STORE_ROOT_DOMAIN` | `prestafrik.com` |
| `STORE_PROXY_SECRET` | la même clé que dans le Worker |
| `BETTER_AUTH_URL` | `https://prestafrik.com` (inchangé) |

Elles doivent être présentes **au build** (adresse des fichiers statiques) puis au démarrage.

## Vérifications

```bash
# La boutique répond sur son sous-domaine
curl -sI https://mboa-style.prestafrik.com/ | head -1          # HTTP/2 200
# Sans la clé, prestafrik.com ignore l'en-tête : page d'accueil PrestAfrik
curl -s -H "x-prestafrik-store-host: mboa-style.prestafrik.com" https://prestafrik.com/ | grep -o "<title>[^<]*"
```

En local : `FEATURE_SUBDOMAINS=true STORE_ROOT_DOMAIN=localhost:3001`, puis
http://mboa-style.localhost:3001 (les navigateurs résolvent `*.localhost`).

## Revenir en arrière

`FEATURE_SUBDOMAINS=false` puis redéployer : les liens partagés redeviennent `prestafrik.com/{adresse}`.
Les sous-domaines déjà partagés restent servis tant que le Worker tourne ; le supprimer les coupe.
