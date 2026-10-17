# Stockage des images : ne plus les perdre au redéploiement

## Pourquoi les images disparaissaient

Les logos et photos envoyés par les vendeurs étaient écrits sur le disque du serveur, dans
`storage/uploads`. Ce dossier n'est pas dans Git (c'est voulu : ce sont des données, pas du code).
À chaque déploiement, l'hébergeur repart d'une copie neuve du dépôt : le dossier est vide et les
images sont perdues, alors que la base de données, elle, garde leurs adresses.

## Solution retenue : Cloudinary

PrestAfrik envoie les images sur **Cloudinary** dès que ces trois variables sont renseignées. Les
fichiers vivent alors chez Cloudinary, indépendamment du serveur : les déploiements ne les touchent
plus. Les adresses des images (`/media/…`) ne changent pas : rien à modifier en base.

### 1. Récupérer les identifiants

1. Créez un compte sur [cloudinary.com](https://cloudinary.com) (l'offre gratuite suffit pour démarrer).
2. Tableau de bord Cloudinary → **Settings** (roue dentée) → **API Keys**.
3. Notez le **Cloud name** (affiché en haut du tableau de bord), l'**API Key** et l'**API Secret**
   (cliquez sur l'œil pour l'afficher). Le secret ne doit jamais être partagé ni commité.

### 2. Les donner à PrestAfrik

**En production** — dans les variables d'environnement de votre hébergeur, puis redéployez :

```env
CLOUDINARY_CLOUD_NAME="votre-cloud-name"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="votre-api-secret"
```

**En local** — collez les mêmes valeurs dans le bloc prévu à la fin de votre fichier `.env`, puis
redémarrez `npm run dev`. Tant qu'elles sont vides, les images restent dans `storage/uploads`.

Facultatif : `CLOUDINARY_FOLDER` choisit le dossier Cloudinary (par défaut `prestafrik`). Utilisez
par exemple `prestafrik-dev` en local pour ne pas mélanger vos essais avec les images de production.

Si une ou deux des trois valeurs seulement sont renseignées, l'envoi et l'affichage des images
échouent avec un message explicite dans les journaux du serveur, plutôt que d'enregistrer les images
sur un disque qui serait effacé au prochain déploiement.

### 3. Vérifier la connexion et reprendre les images existantes

```bash
node scripts/upload-media-to-cloudinary.mjs --check     # teste les identifiants
node scripts/upload-media-to-cloudinary.mjs --dry-run   # liste les images du disque à envoyer
node scripts/upload-media-to-cloudinary.mjs             # les envoie (celles déjà présentes sont ignorées)
```

À lancer sur la machine qui possède encore les images (votre serveur actuel, ou votre poste en local).
Les images déjà perdues lors des déploiements précédents ne peuvent pas être recréées : les vendeurs
concernés doivent les renvoyer depuis leur espace.

### 4. Contrôler

Ajoutez une photo à un produit : elle apparaît dans Cloudinary → **Media Library**, dossier
`prestafrik/stores/<id-boutique>/…`. Redéployez : la photo s'affiche toujours.

### Fonctionnement (pour les développeurs)

- Code : `src/lib/storage.ts` (pilote Cloudinary), servi par `src/app/media/[...path]/route.ts`.
- Chaque image devient un `public_id` : `prestafrik/stores/{boutique}/products/{produit}/{uuid}-800`.
- La lecture passe par l'adresse de livraison publique (CDN, sans quota). Seules la liste des photos
  provisoires (au plus une fois par heure et par boutique) et la suppression d'un dossier utilisent
  l'API d'administration, dont le nombre d'appels par heure est limité.

## Autre solution : un stockage objet S3 compatible

Si vous préférez un **bucket S3 compatible** à Cloudinary, l'application l'utilise dès que la variable
`OBJECT_STORAGE_BUCKET` est définie (et que Cloudinary n'est pas configuré). Les fichiers vivent alors chez le fournisseur de stockage,
indépendamment du serveur : les déploiements ne les touchent plus. Les adresses des images
(`/media/…`) ne changent pas : rien à modifier en base.

Code : `src/lib/storage.ts` (choix du stockage), servi par `src/app/media/[...path]/route.ts`.

### Option A — Supabase Storage (vous utilisez déjà Supabase pour la base)

1. Tableau de bord Supabase → **Storage** → **New bucket**. Nom : `prestafrik-media`. Laissez-le
   **privé** : les images passent par l'application.
2. **Project Settings** → **Storage** → section **S3 Connection** : activez la connexion S3. Notez
   l'**Endpoint** (`https://<ref-du-projet>.supabase.co/storage/v1/s3`) et la **Region** affichée.
3. Même page → **S3 Access Keys** → **New access key**. Copiez l'**Access key ID** et la
   **Secret access key** (la clé secrète n'est affichée qu'une fois).
4. Dans les variables d'environnement de votre hébergeur :

```env
OBJECT_STORAGE_ENDPOINT="https://<ref-du-projet>.supabase.co/storage/v1/s3"
OBJECT_STORAGE_REGION="<region affichée par Supabase, ex. eu-west-3>"
OBJECT_STORAGE_BUCKET="prestafrik-media"
OBJECT_STORAGE_ACCESS_KEY_ID="<access key id>"
OBJECT_STORAGE_SECRET_ACCESS_KEY="<secret access key>"
```

### Option B — Cloudflare R2 (10 Go gratuits, pas de frais de sortie)

1. Cloudflare → **R2** → **Create bucket** : `prestafrik-media`.
2. **R2** → **Manage R2 API Tokens** → **Create API token**, permission *Object Read & Write*
   limitée à ce bucket. Notez l'Access Key ID, la Secret Access Key et l'endpoint
   `https://<account-id>.r2.cloudflarestorage.com`.

```env
OBJECT_STORAGE_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
OBJECT_STORAGE_REGION="auto"
OBJECT_STORAGE_BUCKET="prestafrik-media"
OBJECT_STORAGE_ACCESS_KEY_ID="<access key id>"
OBJECT_STORAGE_SECRET_ACCESS_KEY="<secret access key>"
```

AWS S3, Backblaze B2, Wasabi ou MinIO fonctionnent de la même façon (endpoint, région, bucket, clés).
Pour AWS S3, vous pouvez laisser `OBJECT_STORAGE_ENDPOINT` vide.

### Récupérer les images déjà envoyées

Si le serveur actuel possède encore des images sur son disque, envoyez-les dans le bucket **une
fois**, depuis ce serveur, après avoir ajouté les variables ci-dessus dans son `.env` :

```bash
node scripts/upload-media-to-bucket.mjs --dry-run   # liste ce qui sera envoyé
node scripts/upload-media-to-bucket.mjs             # envoie (les fichiers déjà présents sont ignorés)
```

Les images déjà perdues lors des déploiements précédents ne peuvent pas être recréées : les vendeurs
concernés doivent les renvoyer depuis leur espace (fiche produit, logo de la boutique).

### Vérifier

1. Redéployez l'application avec les nouvelles variables.
2. Ajoutez une photo à un produit, puis vérifiez qu'un fichier apparaît dans le bucket
   (`stores/<id-boutique>/products/…`).
3. Redéployez une seconde fois : la photo doit toujours s'afficher.

## Alternative : serveur VPS avec disque persistant

Sur un VPS (Hostinger VPS, OVH, DigitalOcean…) dont le disque est conservé, vous pouvez garder le
stockage sur disque, à condition de placer le dossier **en dehors** du dossier de l'application
(qui est remplacé à chaque déploiement) :

```bash
sudo mkdir -p /var/lib/prestafrik/uploads
sudo chown <utilisateur-de-l-app> /var/lib/prestafrik/uploads
```

```env
UPLOADS_DIR="/var/lib/prestafrik/uploads"
```

Si vous déployez avec Docker, montez ce dossier en volume (`-v /var/lib/prestafrik/uploads:/data/uploads`
et `UPLOADS_DIR="/data/uploads"`). Pensez à l'inclure dans vos sauvegardes.

**À éviter :** les hébergements « serverless » ou à disque éphémère (Vercel, Netlify, Render sans
disque, Railway sans volume…), ainsi que tout hébergement qui reconstruit l'application dans un dossier
neuf à chaque déploiement Git — seul le stockage objet y conserve les images. En cas de doute,
choisissez Cloudinary (ou un stockage objet) : il fonctionne partout.
