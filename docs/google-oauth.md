# Connexion et inscription avec Google

Le bouton « Continuer avec Google » apparaît sur `/connexion` et `/inscription` dès que les deux
variables `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont renseignées sur le serveur. Sans elles, il
n'est pas affiché et rien d'autre ne change.

- Nouveau compte Google : créé et connecté directement (adresse déjà confirmée par Google), puis
  accueil du tableau de bord avec « Créer ma boutique maintenant ».
- Adresse déjà inscrite avec un mot de passe : le compte Google est rattaché au compte existant.
- Le numéro WhatsApp n'est pas demandé à ce moment : il est saisi dans l'assistant de création de la
  boutique (étape « Coordonnées »).

## Ce que vous devez me fournir

Rien dans le code ni dans Git. Vous renseignez vous-même, dans l'hébergeur :

| Variable | Où la trouver | Secret ? |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Google Cloud → Identifiants → votre « ID client OAuth » (se termine par `.apps.googleusercontent.com`) | non |
| `GOOGLE_CLIENT_SECRET` | Même écran : « Code secret du client » | **oui** |

## Étapes dans Google Cloud

1. Ouvrez <https://console.cloud.google.com> avec le compte Google de PrestAfrik.
2. **Créer un projet** (en haut à gauche) : nom `PrestAfrik`.
3. **API et services → Écran de consentement OAuth** (ou « Google Auth Platform → Branding ») :
   - Type d'utilisateur : **Externe**.
   - Nom de l'application : `PrestAfrik` ; e-mail d'assistance ; logo (facultatif).
   - Domaines autorisés : `prestafrik.com`.
   - Liens : page d'accueil `https://prestafrik.com`, règles de confidentialité
     `https://prestafrik.com/legal/politique-de-confidentialite`, conditions
     `https://prestafrik.com/legal/conditions-generales`.
   - Champs d'application (scopes) : `openid`, `email`, `profile` seulement (aucune validation
     Google n'est alors nécessaire).
4. **Audience** : passez l'application **En production** (« Publier l'application »). En mode
   « Test », seuls les comptes ajoutés comme testeurs peuvent se connecter.
5. **Identifiants → Créer des identifiants → ID client OAuth** :
   - Type : **Application Web** ; nom : `PrestAfrik (production)`.
   - Origines JavaScript autorisées : `https://prestafrik.com`
   - URI de redirection autorisés : `https://prestafrik.com/api/auth/callback/google`
   - Créez, puis copiez l'**ID client** et le **Code secret du client**.
6. Pour le développement local, créez un second ID client (`PrestAfrik (local)`) avec
   `http://localhost:3000` et `http://localhost:3000/api/auth/callback/google`, et mettez ses valeurs
   dans votre `.env` local (jamais commité).

L'URI de redirection doit correspondre exactement à `BETTER_AUTH_URL` + `/api/auth/callback/google`
(même domaine, `https`, sans barre finale en trop) : sinon Google affiche « redirect_uri_mismatch ».

## Mise en service

1. Hostinger → **Sites web → Node.js → Variables d'environnement** : ajoutez `GOOGLE_CLIENT_ID` et
   `GOOGLE_CLIENT_SECRET`, puis redémarrez l'application.
2. Ouvrez `https://prestafrik.com/connexion` : le bouton « Continuer avec Google » est visible.
3. Testez avec un compte Google qui n'a jamais utilisé PrestAfrik : vous arrivez sur le tableau de
   bord avec les félicitations. Testez ensuite avec l'adresse d'un compte existant.

| Message | Cause probable |
| --- | --- |
| `redirect_uri_mismatch` | URI de redirection différent dans Google Cloud (étape 5). |
| `access_blocked` / « Cette application n'est pas validée » | Écran de consentement encore en mode Test, ou scopes en plus de `openid email profile`. |
| Retour sur `/connexion` avec « La connexion avec Google n'a pas abouti » | Annulation par l'utilisateur, ou identifiants incorrects dans l'hébergeur. |
