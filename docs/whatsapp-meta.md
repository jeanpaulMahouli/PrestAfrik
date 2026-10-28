# WhatsApp Business : codes de vérification de PrestAfrik

Ce guide configure le **compte WhatsApp officiel de PrestAfrik**, qui envoie les codes à 6 chiffres à
l'inscription et pour le mot de passe oublié. Il est distinct des comptes WhatsApp des boutiques
(Ma boutique → Connexion WhatsApp), qui restent configurés boutique par boutique.

> État : le code est prêt et testé en local (mode développement, sans Meta). L'envoi réel n'est
> **pas** opérationnel tant que les étapes ci-dessous ne sont pas faites et que le test final (étape 9)
> n'a pas réussi.

## Ce que fait l'application

| Élément | Où |
| --- | --- |
| Envoi du code (modèle « Authentification ») | `src/modules/whatsapp/platform.ts` |
| Inscription, connexion, mot de passe oublié par numéro | `src/modules/auth/whatsapp-plugin.ts` (`/api/auth/whatsapp/…`) |
| Règles des codes (10 min, 5 essais, 60 s entre deux envois, 5 envois / 24 h) | `src/modules/auth/phone-otp.ts` |
| Webhook Meta (vérification + statuts de distribution signés) | `src/app/api/webhooks/whatsapp/route.ts` |

Les codes ne sont jamais stockés en clair (empreinte HMAC), ni écrits dans les journaux. Les mots de
passe sont hachés par Better Auth (scrypt) dès la demande d'inscription.

## 1. Créer ou choisir l'application Meta

1. Ouvrez <https://developers.facebook.com/apps> avec le compte Facebook administrateur du
   **portefeuille Business** de PrestAfrik (Meta Business Suite).
2. **Créer une application** → cas d'usage « Autre » → type **Entreprise** → associez-la au portefeuille
   Business de PrestAfrik.
3. Gardez une application par environnement si possible : `PrestAfrik (dev)` et `PrestAfrik`
   (production), chacune avec ses propres jetons et son propre webhook.

## 2. Ajouter le produit WhatsApp

Dans l'application : **Ajouter un produit** → **WhatsApp** → **Configurer**. Meta crée (ou relie) un
**compte WhatsApp Business (WABA)** et propose un numéro de test.

## 3. Numéro expéditeur

1. WhatsApp → **Configuration de l'API** → **Ajouter un numéro de téléphone**.
2. Utilisez un numéro **qui n'est pas déjà utilisé dans l'application WhatsApp** (ou supprimez-le de
   l'application avant). Nom affiché : « PrestAfrik » (Meta le fait valider).
3. Confirmez le numéro par SMS ou appel, puis définissez le code PIN à deux facteurs.
4. Notez l'**identifiant du numéro de téléphone** (*Phone number ID*, une suite de chiffres) : ce
   n'est **pas** le numéro lui-même.

Avec le numéro de test de Meta, vous ne pouvez écrire qu'aux 5 numéros ajoutés dans « À » de la page
Configuration de l'API : pratique pour l'étape 9 avant la mise en production.

## 4. Modèle de message « Authentification »

WhatsApp Manager → **Modèles de message** → **Créer un modèle** :

- Catégorie : **Authentification** ; nom : `prestafrik_code` ; langue : **Français** (`fr`).
- Livraison du code : **Copier le code** (bouton « Copier le code »).
- Options conseillées : ajouter l'avertissement de sécurité, expiration du code : **10 minutes**.

Attendez le statut **Approuvé** (souvent quelques minutes). Si vous changez le nom ou la langue,
reportez-les dans `WHATSAPP_OTP_TEMPLATE_NAME` / `WHATSAPP_OTP_TEMPLATE_LANGUAGE`.

## 5. Jeton d'accès permanent

Le jeton « temporaire » de la page Configuration de l'API expire en 24 h : n'en mettez pas en production.

1. business.facebook.com → **Paramètres** → **Utilisateurs** → **Utilisateurs système** → **Ajouter**
   (rôle Administrateur), nom par exemple `prestafrik-api`.
2. **Ajouter des éléments** : l'application (contrôle total) et le compte WhatsApp Business (contrôle total).
3. **Générer un jeton** → application PrestAfrik → expiration **Jamais** → autorisations
   `whatsapp_business_messaging` et `whatsapp_business_management`.
4. Copiez le jeton une seule fois, directement dans le gestionnaire de secrets de l'hébergeur.

## 6. Variables d'environnement

À renseigner dans l'hébergeur (Hostinger : **Sites web → Node.js → Variables d'environnement**), puis
redémarrer l'application. **Jamais dans le code ni dans Git** (`.env` est ignoré par Git).

| Variable | Rôle | Secret ? |
| --- | --- | --- |
| `WHATSAPP_PLATFORM_PHONE_NUMBER_ID` | Identifiant du numéro expéditeur (étape 3) | non, mais propre à l'environnement |
| `WHATSAPP_PLATFORM_ACCESS_TOKEN` | Jeton permanent de l'utilisateur système (étape 5) | **oui** |
| `WHATSAPP_OTP_TEMPLATE_NAME` | Nom du modèle approuvé (défaut `prestafrik_code`) | non |
| `WHATSAPP_OTP_TEMPLATE_LANGUAGE` | Langue du modèle (défaut `fr`) | non |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Chaîne aléatoire (16 caractères minimum), recopiée dans Meta (étape 7) | **oui** |
| `WHATSAPP_APP_SECRET` | Clé secrète de l'application (Paramètres → Général), vérifie la signature des webhooks | **oui** |
| `WHATSAPP_GRAPH_API_VERSION` | Version de l'API Graph (défaut `v23.0`) | non |
| `WHATSAPP_DEV_LOG_CODES` | `true` en **développement uniquement** : le code s'affiche dans le terminal au lieu d'être envoyé. Ignoré en production. | non |

Générer le jeton de vérification :
`node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"`

Sans `WHATSAPP_PLATFORM_PHONE_NUMBER_ID` / `WHATSAPP_PLATFORM_ACCESS_TOKEN`, l'inscription affiche
« L'envoi des codes par WhatsApp n'est pas encore activé » et n'envoie rien (aucun compte n'est créé).

## 7. Webhook

1. Application → WhatsApp → **Configuration** → Webhook → **Modifier**.
2. URL de rappel : `https://prestafrik.com/api/webhooks/whatsapp` (domaine public HTTPS de
   l'environnement ; jamais `localhost`).
3. Jeton de vérification : la valeur de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. **Vérifier et enregistrer** :
   Meta appelle l'URL en GET, l'application répond le `hub.challenge` (403 si le jeton diffère).
4. Champs du webhook : abonnez-vous à **`messages`** (il transporte aussi les statuts `sent`,
   `delivered`, `read`, `failed` des messages envoyés).
5. Si le compte WhatsApp Business n'apparaît pas abonné, appelez une fois :
   `POST https://graph.facebook.com/v23.0/<WABA_ID>/subscribed_apps` avec le jeton de l'étape 5.

Chaque événement POST est refusé (401) si sa signature `X-Hub-Signature-256` ne correspond pas à
`WHATSAPP_APP_SECRET`, et ignoré (503) si ce secret n'est pas configuré.

## 8. Passage en production

- **Vérification de l'entreprise** dans Meta Business Suite (Centre de sécurité) : nécessaire pour
  dépasser les limites d'envoi de départ et faire valider le nom affiché.
- **Mode de l'application : En ligne** (Live) dans le tableau de bord de l'application.
- **Moyen de paiement** sur le compte WhatsApp Business : les messages d'authentification sont facturés
  par Meta (tarif par pays).
- Les autorisations `whatsapp_business_messaging` / `whatsapp_business_management` suffisent pour votre
  propre compte ; l'« examen de l'application » n'est demandé que pour gérer les comptes d'autres entreprises.

## 9. Tests à faire pour confirmer l'envoi réel

1. Vérification du webhook : `curl "https://<domaine>/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<jeton>&hub.challenge=42"`
   doit répondre `42` ; avec un mauvais jeton : `403`.
2. Dans Meta (Webhook → champ `messages` → **Tester**) : l'application doit répondre `200`.
3. Ouvrez `/inscription` avec un vrai numéro WhatsApp (ajouté aux destinataires de test tant que le
   numéro de test est utilisé) : le message PrestAfrik arrive avec le code et le bouton « Copier le code ».
4. Saisissez un code faux (message « Code incorrect… encore 4 essais »), puis le bon : vous arrivez sur
   « Créer ma boutique ».
5. Numéro sans WhatsApp : l'écran du code affiche, après quelques secondes, « WhatsApp n'a pas pu
   distribuer le message » (statut `failed` reçu par le webhook).
6. Mot de passe oublié → « Par WhatsApp » : code reçu, nouveau mot de passe, connexion avec le numéro.
7. Journaux de l'hébergeur : aucune ligne ne doit contenir de code ni de numéro complet (seulement
   `+237 6•• ••• •42`).

## Dépannage

| Message dans les journaux | Cause probable |
| --- | --- |
| `erreur 190` | Jeton expiré ou révoqué : régénérer (étape 5). |
| `erreur 132001` | Modèle introuvable ou non approuvé dans cette langue (étape 4). |
| `erreur 131030` / `131026` | Destinataire non autorisé (numéro de test) ou sans WhatsApp. |
| `erreur 131031` / `131042` | Compte bloqué ou problème de paiement chez Meta. |
| `WHATSAPP_APP_SECRET manquant` | Webhook non sécurisé : renseigner la clé secrète. |
