# Préparer la configuration de production

Utilise [`../.env.production.example`](../.env.production.example) comme liste de variables. Ajoute
leurs vraies valeurs dans le gestionnaire de secrets de l’hébergeur ; ne commite pas de fichier
`.env` rempli et ne transmets aucune clé par e-mail ou messagerie. Duplique la base de développement
dans une base de production distincte et vérifie son plan de sauvegarde avant la première migration.

## E-mail : réception IMAP et envoi SMTP

Better Auth doit pouvoir envoyer les liens de vérification, de récupération de mot de passe et
d’invitation. SMTP sert à l’envoi. IMAP sert uniquement à relever une boîte de réception et est
facultatif si PrestAfrik n’a pas à lire les réponses entrantes. Les deux protocoles ne sont pas
interchangeables.

Renseigne le nom d’hôte, le port, le compte et le mot de passe fournis par le fournisseur de
messagerie. Utilise le chiffrement recommandé par celui-ci (souvent SMTP/465 avec TLS implicite ou
SMTP/587 avec STARTTLS ; IMAP/993 avec TLS). Configure aussi un domaine expéditeur vérifié et ses
enregistrements SPF, DKIM et DMARC.

**État du code :** l’envoi transactionnel SMTP est branché sur l’inscription/vérification, la
réinitialisation du mot de passe et les invitations d’équipe. Une configuration SMTP vide ou
placeholder empêche le démarrage en production et bloque explicitement les envois dans les autres
environnements. IMAP n’est pas lu par l’application et ne doit pas être configuré sauf besoin
futur distinct.

## WhatsApp Business Cloud API

Prépare un compte Meta Business vérifié, un compte WhatsApp Business, un numéro enregistré et
l’accès à l’API Cloud. Copie l’identifiant du numéro et du compte, la version Graph API et les
jetons dans le gestionnaire de secrets. Configure une URL de webhook publique HTTPS, son jeton de
vérification et le secret de signature d’application. N’utilise pas un jeton temporaire pour le
service en production ; limite et renouvelle les accès conformément aux règles Meta.

**État du code :** PrestAfrik journalise actuellement les messages en simulation. Les variables
documentées ne connectent pas un compte Meta et ne déclenchent aucun envoi.

## Paiement d’abonnement

Choisis un prestataire qui accepte l’entreprise, les moyens de paiement et le règlement en XAF
(par exemple Mobile Money au Cameroun). Vérifie auprès du prestataire les frais, délais de reversement,
remboursements, renouvellements et exigences de vérification. Renseigne ensuite ses URL, clés et
secret de webhook dans l’hébergeur.

**État du code :** les champs de paiement du modèle sont réservés à la préparation. Aucun adaptateur
de paiement ou de webhook n’est branché ; en production, la simulation est désactivée. Ne collecte
pas de clé avant d’avoir choisi le prestataire et l’adaptateur à réaliser.

## Images, URL et base

Configure un bucket S3 compatible privé/public selon le besoin, son URL publique CDN, sa région et
ses identifiants. L’application utilise encore `public/uploads` en développement : ce stockage
local ne convient pas à un hébergement dont le disque est éphémère ; les variables de stockage du
modèle ne sont pas encore consommées par le code.

En production, `BETTER_AUTH_URL` doit être l’origine HTTPS publique sans chemin. `BETTER_AUTH_SECRET`
doit être aléatoire et contenir au moins 32 caractères. `DATABASE_URL` pointe vers la base de
production utilisée par l’application et `DIRECT_URL` vers sa connexion directe pour Prisma.

## Informations commerciales et documents légaux

Renseigne la dénomination légale, forme, adresse au Cameroun, RCCM ou immatriculation applicable,
NIU si applicable, contacts, responsable de publication, hébergeur, pays de stockage, contacts
relatifs aux données, durées de conservation et règles commerciales propres à chaque vendeur.
Complète et fais relire les documents `/legal/*` par un professionnel du droit camerounais avant
de les utiliser contractuellement. Les pages affichent volontairement un avertissement de brouillon
et des champs à compléter ; elles ne constituent pas un avis juridique.

## Vérifications avant ouverture

1. Remplacer tous les placeholders et vérifier le domaine HTTPS.
2. Configurer les services dans le gestionnaire de secrets et vérifier les clés côté serveur.
3. Implémenter puis tester chaque adaptateur (vérification, reset, invitations, WhatsApp, paiement,
   webhook signé et stockage durable) ; la simple présence d’une variable ne prouve pas que le
   fournisseur est connecté.
4. Tester l’inscription, les courriels réels, le paiement et les retours d’erreur sur un environnement
   de préproduction.
5. Sauvegarder la base, valider le plan de retour arrière, puis seulement appliquer les migrations
   à la base de production identifiée.
