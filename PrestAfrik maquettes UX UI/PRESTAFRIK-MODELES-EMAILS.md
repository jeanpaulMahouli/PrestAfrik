# PrestAfrik — Modèles d’e-mails

> Document de référence pour la rédaction et le développement de **tous les e-mails envoyés par PrestAfrik**. Il accompagne le brief de réalisation (`PRESTAFRIK-BRIEF-CLAUDE-CODE.md`) et les maquettes de la page « E-mails ». Langue : **français**. Ton : **professionnel, courtois, enthousiaste et très explicite**, avec **vouvoiement**.

Dernière mise à jour : 15 octobre 2026.

---

## 1. Principes de rédaction

1. **Dire pourquoi on écrit.** La première phrase explique la raison de l’e-mail (« Nous avons reçu une demande… », « Votre essai se termine… »).
2. **Une seule action principale par e-mail**, portée par un bouton orange (texte bleu nuit `#000026`). Si le bouton ne fonctionne pas, le lien complet est repris en texte.
3. **Être explicite sur les délais et les conséquences** : durée de validité du lien, ce qui se passe si l’on ne fait rien, ce qui est conservé (données, commandes).
4. **Rassurer sur la sécurité** : toujours préciser « Vous n’êtes pas à l’origine de cette demande ? Ignorez ce message » quand c’est pertinent. Jamais de mot de passe, de jeton ni de numéro complet dans un e-mail.
5. **Ton courtois et chaleureux, sans excès** : phrases courtes, vocabulaire simple, pas de jargon, pas de majuscules criardes. Pas d’emoji dans les e-mails de **sécurité, de paiement ou d’erreur**. Les félicitations (boutique publiée, nouvelle commande) peuvent être enthousiastes.
6. **Montants** en `28 500 FCFA`, **dates** en `15/10/2026`, **heures** en `14:02` (heure du Cameroun, Africa/Douala), **numéros** partiellement masqués.
7. **Signature** : « À très bientôt, L’équipe PrestAfrik ».
8. **Aucun e-mail ne promet ce que le système ne peut pas garantir** (par exemple : ne jamais affirmer qu’un montant a été débité si le prestataire ne l’a pas confirmé).

## 2. Structure d’un e-mail

| Zone | Contenu |
|---|---|
| Objet | 60 caractères idéalement, 78 au maximum ; explicite, sans majuscules intégrales, sans « RE: » trompeur |
| Pré-en-tête (*preheader*) | 40 à 100 caractères ; complète l’objet |
| En-tête | Logo PrestAfrik sur fond blanc, filet orange `#FF9900` de 5 px en haut |
| Titre | Une phrase, 24 px, bleu nuit |
| Corps | Paragraphes de 15 px, interligne 1,7 ; listes à puces si plusieurs éléments |
| Bouton | Orange `#FF9900`, texte `#000026` gras, coins arrondis 10 px, hauteur de zone tactile ≥ 44 px |
| Encadré de sécurité ou d’information | Fond crème `#FFF9EE`, texte `#53645B` |
| Signature | « À très bientôt, L’équipe PrestAfrik » |
| Pied de page | Aide (réponse à l’e-mail ou adresse de contact), mention « PrestAfrik · La boutique en ligne pensée pour les commerçants camerounais », liens Conditions et Confidentialité |

Largeur du contenu : **600 à 640 px**, fond de page `#F1F2EE`. Les e-mails sont des **courriers transactionnels** : pas de lien de désinscription obligatoire pour la sécurité et la facturation ; les **notifications d’activité** (E10, E21, E22, E23) peuvent être désactivées dans les préférences du compte.

## 3. Règles techniques d’implémentation

- **Gabarits** : composants React (`@react-email/components`) ou MJML, **une seule mise en page de base** partagée, versionnée dans `src/modules/mail/templates/`. Les textes viennent du fichier central des textes (jamais écrits dans les composants).
- **Version texte brut** obligatoire pour chaque e-mail (`text/plain`), générée à partir du même contenu.
- **Compatibilité** : tableaux HTML pour la mise en page, styles en ligne, images avec texte alternatif, bouton « à toute épreuve » (compatible Outlook), mode sombre testé, lecture correcte sans images.
- **Accessibilité** : langue `fr`, hiérarchie de titres, contrastes ≥ 4,5:1, texte des liens explicite (« Confirmer mon adresse e-mail », pas « Cliquez ici »).
- **Expéditeur** : `PrestAfrik <ne-pas-repondre@prestafrik.com>` pour les envois automatiques, avec `Reply-To: contact@prestafrik.com` (adresses à confirmer par le propriétaire du domaine).
- **Authentification du domaine** : SPF, DKIM et DMARC configurés **avant** la mise en production, pour éviter le classement en courrier indésirable.
- **Envoi** : via l’interface `Mailer` (SMTP ou API d’un prestataire), **file d’envoi** avec reprises limitées (3 tentatives, délai croissant), journal des envois **sans contenu sensible** (jamais le lien complet ni le jeton).
- **Liens à usage unique** : jeton aléatoire de 32 octets ; **seule l’empreinte SHA-256 est stockée** ; expiration appliquée côté serveur.
- **Limitation de débit** : au plus 3 e-mails de sécurité par heure et par compte ; au plus 1 e-mail de « messages échoués » par heure et par boutique.
- **Tests** : aperçu de chaque modèle dans `/dev/inbox` (développement uniquement) ; tests unitaires vérifiant que **toutes les variables** sont remplacées, qu’**aucun jeton n’apparaît dans les logs**, et que chaque e-mail contient une version texte.
- **Développement et tests** : aucun envoi réel (adresses `example.test`), même si des identifiants de production existent dans l’environnement.
- **Variables** : écrites `{{variable}}` dans ce document. Toute variable absente fait échouer l’envoi (jamais d’e-mail partiel avec une variable visible).
- **Traductions** : prévoir un fichier par langue (`fr` d’abord), sans modifier les composants.

## 4. Index des e-mails

| N° | Groupe | E-mail | Destinataire |
|---|---|---|---|
| E01 | Compte et sécurité | Confirmation de l’adresse e-mail (inscription) | Le nouvel utilisateur. |
| E02 | Compte et sécurité | Bienvenue (adresse confirmée) | L’utilisateur. |
| E03 | Compte et sécurité | Nouveau lien de confirmation | L’utilisateur. |
| E04 | Compte et sécurité | Réinitialisation du mot de passe | Le titulaire du compte (si le compte existe ; la réponse affichée à l’écran est identique dans tous les cas). |
| E05 | Compte et sécurité | Mot de passe modifié (alerte de sécurité) | Le titulaire du compte. |
| E06 | Compte et sécurité | Connexion depuis un nouvel appareil | Le titulaire du compte. |
| E07 | Compte et sécurité | Changement d’adresse e-mail : confirmation (nouvelle adresse) | La nouvelle adresse. |
| E08 | Compte et sécurité | Changement d’adresse e-mail : alerte (ancienne adresse) | L’ancienne adresse. |
| E09 | Équipe | Invitation à rejoindre une boutique | La personne invitée. |
| E10 | Équipe | Invitation acceptée | Le Propriétaire. |
| E11 | Équipe | Retrait de l’équipe | Le membre retiré. |
| E12 | Équipe | Changement de rôle | Le membre concerné. |
| E13 | Boutique | Boutique publiée | Le Propriétaire. |
| E14 | Abonnement | Votre essai se termine bientôt | Le Propriétaire. |
| E15 | Abonnement | Abonnement expiré : ce qui change | Le Propriétaire. |
| E16 | Abonnement | Paiement confirmé | Le Propriétaire. |
| E17 | Abonnement | Échec du paiement | Le Propriétaire. |
| E18 | Abonnement | Changement d’offre | Le Propriétaire. |
| E19 | Boutique | Boutique mise en pause | Le Propriétaire. |
| E20 | Boutique | Boutique suspendue par l’administration | Le Propriétaire. |
| E21 | Activité | Nouvelle commande reçue | Les membres qui ont activé cette notification. |
| E22 | Activité | Messages WhatsApp échoués | Propriétaire et Gestionnaires. |
| E23 | Activité | Quota de messages presque atteint | Le Propriétaire. |
| E24 | Contact | Accusé de réception du formulaire de contact | La personne qui a écrit. |
| E25 | Compte et sécurité | Lien de réinitialisation envoyé par un administrateur | Le titulaire du compte. |

Les e-mails **E01, E02, E04, E05, E09, E13, E14 et E16** sont maquettés sur la page « E-mails » du canevas ; les autres suivent la même mise en page.

**Hors périmètre** : e-mails aux clients acheteurs (le canal avec eux est WhatsApp, voir le brief) et reçus de commande (aucun reçu n’est délivré).

---

## 5. Modèles

### E01 — Confirmation de l’adresse e-mail (inscription)

| | |
|---|---|
| **Déclencheur** | Juste après la création du compte. |
| **Destinataire** | Le nouvel utilisateur. |
| **Objet** | Confirmez votre adresse e-mail pour activer votre compte PrestAfrik |
| **Pré-en-tête** | Un clic suffit pour finaliser votre inscription. |
| **Variables** | `{{prenom}}, {{lien}}` |
| **Règles** | Lien à usage unique, 48 h. Le compte reste utilisable avant confirmation, mais la publication d’une boutique exige une adresse confirmée. |

**Contenu**

> **Bienvenue, {{prenom}} !**
>
> Merci d’avoir créé votre compte PrestAfrik. Pour finaliser votre inscription et sécuriser votre compte, nous avons simplement besoin de vérifier que cette adresse e-mail est bien la vôtre.
>
> Il vous suffit de cliquer sur le bouton ci-dessous.
>
> **[ Confirmer mon adresse e-mail ]**
>
> *Ce lien est valable 48 heures et ne peut être utilisé qu’une seule fois. Vous n’êtes pas à l’origine de cette inscription ? Ignorez simplement ce message : aucun compte ne sera activé.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E02 — Bienvenue (adresse confirmée)

| | |
|---|---|
| **Déclencheur** | Dès que l’adresse e-mail est confirmée. |
| **Destinataire** | L’utilisateur. |
| **Objet** | Votre compte est confirmé : lancez votre boutique ! |
| **Pré-en-tête** | Voici comment démarrer en quelques minutes. |
| **Variables** | `{{prenom}}, {{finEssai}}, {{lien}}` |
| **Règles** | Envoyé une seule fois par compte. |

**Contenu**

> **C’est confirmé, {{prenom}} !**
>
> Votre adresse e-mail est confirmée et votre mois d’essai gratuit est en cours jusqu’au {{finEssai}}. Voici les trois étapes pour mettre votre boutique en ligne :
>
> - 1. Créez votre boutique : son nom, votre activité, votre ville et vos coordonnées.
> - 2. Ajoutez vos premiers produits, avec jusqu’à 5 photos chacun.
> - 3. Partagez le lien ou le QR code de votre boutique avec vos clients.
>
> **[ Créer ma boutique ]**
>
> *Une question ? Répondez simplement à cet e-mail : nous vous répondons avec plaisir.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E03 — Nouveau lien de confirmation

| | |
|---|---|
| **Déclencheur** | L’utilisateur demande un nouveau lien, ou l’ancien a expiré. |
| **Destinataire** | L’utilisateur. |
| **Objet** | Votre nouveau lien de confirmation PrestAfrik |
| **Pré-en-tête** | L’ancien lien n’est plus valable. Utilisez celui-ci. |
| **Variables** | `{{prenom}}, {{lien}}` |
| **Règles** | Limiter à 3 envois par heure et par compte. L’ancien lien est invalidé. |

**Contenu**

> **Voici votre nouveau lien**
>
> Vous avez demandé un nouveau lien pour confirmer votre adresse e-mail. Le précédent est désormais désactivé.
>
> Cliquez sur le bouton ci-dessous pour terminer la confirmation.
>
> **[ Confirmer mon adresse e-mail ]**
>
> *Ce lien est valable 48 heures et ne peut être utilisé qu’une seule fois.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E04 — Réinitialisation du mot de passe

| | |
|---|---|
| **Déclencheur** | Demande de mot de passe oublié. |
| **Destinataire** | Le titulaire du compte (si le compte existe ; la réponse affichée à l’écran est identique dans tous les cas). |
| **Objet** | Réinitialisez votre mot de passe PrestAfrik |
| **Pré-en-tête** | Ce lien est valable 60 minutes. |
| **Variables** | `{{email}}, {{lien}}` |
| **Règles** | Lien à usage unique, 60 min. Jamais de mot de passe dans l’e-mail. Limiter à 3 demandes par heure. |

**Contenu**

> **Besoin d’un nouveau mot de passe ?**
>
> Nous avons reçu une demande de réinitialisation du mot de passe du compte PrestAfrik associé à l’adresse {{email}}.
>
> Cliquez sur le bouton ci-dessous pour en choisir un nouveau (8 caractères minimum). Votre mot de passe actuel reste valable tant que vous n’en avez pas choisi un nouveau.
>
> **[ Choisir un nouveau mot de passe ]**
>
> *Ce lien est valable 60 minutes et ne peut servir qu’une seule fois. Vous n’avez rien demandé ? Ignorez ce message : votre compte reste protégé.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E05 — Mot de passe modifié (alerte de sécurité)

| | |
|---|---|
| **Déclencheur** | Après un changement ou une réinitialisation de mot de passe. |
| **Destinataire** | Le titulaire du compte. |
| **Objet** | Votre mot de passe PrestAfrik a été modifié |
| **Pré-en-tête** | Si ce n’était pas vous, agissez dès maintenant. |
| **Variables** | `{{date}}, {{heure}}, {{lien}}` |
| **Règles** | Toutes les sessions sont révoquées avant l’envoi. |

**Contenu**

> **Votre mot de passe a bien été modifié**
>
> Le {{date}} à {{heure}} (heure du Cameroun), le mot de passe de votre compte PrestAfrik a été modifié.
>
> Par mesure de sécurité, nous vous avons déconnecté de tous vos appareils. Il vous suffit de vous reconnecter avec votre nouveau mot de passe.
>
> **[ Me connecter ]**
>
> *Ce n’est pas vous ? Réinitialisez immédiatement votre mot de passe depuis la page de connexion et écrivez-nous : nous vous aiderons à sécuriser votre compte.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E06 — Connexion depuis un nouvel appareil

| | |
|---|---|
| **Déclencheur** | Connexion depuis un navigateur ou un appareil inconnu (réglage activé par défaut, désactivable). |
| **Destinataire** | Le titulaire du compte. |
| **Objet** | Nouvelle connexion à votre compte PrestAfrik |
| **Pré-en-tête** | Vérifiez que c’est bien vous. |
| **Variables** | `{{date}}, {{heure}}, {{appareil}}, {{navigateur}}, {{ville}}, {{lien}}` |
| **Règles** | Ne jamais afficher l’adresse IP complète. Localisation approximative uniquement. |

**Contenu**

> **Une nouvelle connexion a été détectée**
>
> Votre compte s’est connecté depuis un nouvel appareil.
>
> - Date : {{date}} à {{heure}}
> - Appareil : {{appareil}}
> - Navigateur : {{navigateur}}
> - Localisation approximative : {{ville}}
>
> Si c’est bien vous, vous n’avez rien à faire.
>
> **[ Ce n’était pas moi ]**
>
> *Si vous ne reconnaissez pas cette connexion, ce bouton vous permettra de changer votre mot de passe et de déconnecter tous les appareils.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E07 — Changement d’adresse e-mail : confirmation (nouvelle adresse)

| | |
|---|---|
| **Déclencheur** | L’utilisateur demande à changer l’adresse e-mail de son compte. |
| **Destinataire** | La nouvelle adresse. |
| **Objet** | Confirmez votre nouvelle adresse e-mail |
| **Pré-en-tête** | Le changement ne sera effectif qu’après votre confirmation. |
| **Variables** | `{{lien}}` |
| **Règles** | Lien à usage unique, 48 h. |

**Contenu**

> **Confirmez votre nouvelle adresse**
>
> Vous avez demandé à utiliser cette adresse pour votre compte PrestAfrik. Pour valider le changement, cliquez sur le bouton ci-dessous.
>
> **[ Confirmer cette adresse ]**
>
> *Ce lien est valable 48 heures. Tant que vous n’avez pas confirmé, votre ancienne adresse reste active.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E08 — Changement d’adresse e-mail : alerte (ancienne adresse)

| | |
|---|---|
| **Déclencheur** | Le changement d’adresse vient d’être confirmé. |
| **Destinataire** | L’ancienne adresse. |
| **Objet** | L’adresse e-mail de votre compte PrestAfrik a changé |
| **Pré-en-tête** | Si vous n’êtes pas à l’origine de ce changement, répondez-nous sans attendre. |
| **Variables** | `{{nouvelleAdresse}}` |
| **Règles** | Envoyé uniquement à l’ancienne adresse. |

**Contenu**

> **Votre adresse e-mail a été modifiée**
>
> L’adresse e-mail de votre compte PrestAfrik est maintenant {{nouvelleAdresse}}. Vous ne recevrez plus de messages sur cette ancienne adresse.
>
> *Ce n’est pas vous ? Répondez à cet e-mail immédiatement : nous bloquerons le compte le temps de vérifier.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E09 — Invitation à rejoindre une boutique

| | |
|---|---|
| **Déclencheur** | Le Propriétaire invite un collaborateur. |
| **Destinataire** | La personne invitée. |
| **Objet** | {{inviteur}} vous invite à rejoindre {{boutique}} sur PrestAfrik |
| **Pré-en-tête** | Vous avez 7 jours pour accepter l’invitation. |
| **Variables** | `{{inviteur}}, {{boutique}}, {{role}}, {{descriptionRole}}, {{email}}, {{lien}}` |
| **Règles** | Lien à usage unique, 7 jours, lié à l’adresse invitée. Descriptions de rôles générées depuis la matrice de permissions. |

**Contenu**

> **Vous êtes invité(e) à rejoindre {{boutique}}**
>
> {{inviteur}} vous invite à rejoindre la boutique {{boutique}} sur PrestAfrik avec le rôle de {{role}}.
>
> {{descriptionRole}}
>
> **[ Accepter l’invitation ]**
>
> *Cette invitation est valable 7 jours et réservée à l’adresse {{email}}. Vous n’avez pas encore de compte ? Vous pourrez en créer un gratuitement en un instant. Vous ne connaissez pas {{inviteur}} ? Ignorez ce message.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E10 — Invitation acceptée

| | |
|---|---|
| **Déclencheur** | Le collaborateur accepte l’invitation. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | {{membre}} a rejoint {{boutique}} |
| **Pré-en-tête** | Votre équipe s’agrandit. |
| **Variables** | `{{membre}}, {{boutique}}, {{role}}, {{lien}}` |
| **Règles** | Peut être désactivé dans les préférences de notification. |

**Contenu**

> **Bonne nouvelle : votre équipe s’agrandit !**
>
> {{membre}} a accepté votre invitation et fait désormais partie de {{boutique}} avec le rôle de {{role}}.
>
> Vous pouvez modifier ses droits ou le retirer de l’équipe à tout moment depuis la page « Mon équipe ».
>
> **[ Voir mon équipe ]**
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E11 — Retrait de l’équipe

| | |
|---|---|
| **Déclencheur** | Le Propriétaire retire un membre. |
| **Destinataire** | Le membre retiré. |
| **Objet** | Votre accès à {{boutique}} a été retiré |
| **Pré-en-tête** | Votre compte PrestAfrik reste actif. |
| **Variables** | `{{boutique}}` |
| **Règles** | Effet immédiat, y compris sur les sessions ouvertes. |

**Contenu**

> **Votre accès à {{boutique}} a pris fin**
>
> Le propriétaire de {{boutique}} a retiré votre accès à cette boutique. Vous ne pouvez plus consulter ses commandes ni ses clients.
>
> Votre compte PrestAfrik reste actif et vos autres boutiques ne sont pas concernées.
>
> *Une question ? Contactez directement le propriétaire de la boutique.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E12 — Changement de rôle

| | |
|---|---|
| **Déclencheur** | Le Propriétaire modifie le rôle d’un membre. |
| **Destinataire** | Le membre concerné. |
| **Objet** | Votre rôle dans {{boutique}} a changé |
| **Pré-en-tête** | Voici ce que vous pouvez désormais faire. |
| **Variables** | `{{boutique}}, {{role}}, {{descriptionRole}}, {{lien}}` |
| **Règles** | Effet immédiat. |

**Contenu**

> **Votre rôle a été mis à jour**
>
> Dans la boutique {{boutique}}, votre rôle est maintenant : {{role}}.
>
> {{descriptionRole}}
>
> **[ Ouvrir la boutique ]**
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E13 — Boutique publiée

| | |
|---|---|
| **Déclencheur** | Publication réussie de la boutique. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | Félicitations, {{boutique}} est en ligne ! |
| **Pré-en-tête** | Voici votre lien à partager dès maintenant. |
| **Variables** | `{{boutique}}, {{adresseBoutique}}, {{lien}}` |
| **Règles** | Une seule fois par boutique. |

**Contenu**

> **Votre boutique prend vie !**
>
> {{boutique}} est maintenant visible par vos clients à l’adresse :
>
> {{adresseBoutique}}
>
> Pour attirer vos premiers clients, partagez ce lien ou votre QR code sur WhatsApp, vos réseaux sociaux et vos cartes de visite.
>
> - Réglez vos zones de livraison.
> - Choisissez comment vos clients confirment leurs commandes sur WhatsApp.
> - Ajoutez d’autres produits pour donner du choix.
>
> **[ Aller à mon tableau de bord ]**
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E14 — Votre essai se termine bientôt

| | |
|---|---|
| **Déclencheur** | J-7, J-3 et J-1 avant la fin de l’essai. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | Votre essai gratuit PrestAfrik se termine dans {{jours}} jour(s) |
| **Pré-en-tête** | Choisissez une offre pour garder votre boutique en ligne. |
| **Variables** | `{{jours}}, {{finEssai}}, {{boutique}}, {{lien}}` |
| **Règles** | Les prix et quotas viennent de la table des offres. |

**Contenu**

> **Plus que {{jours}} jour(s) d’essai**
>
> Votre essai gratuit se termine le {{finEssai}}. Pour que {{boutique}} reste en ligne sans interruption, choisissez l’offre qui vous convient.
>
> - Essentiel : 3 000 FCFA par mois ou 30 000 FCFA par an
> - Business : 7 500 FCFA par mois ou 75 000 FCFA par an
> - Pro : 15 000 FCFA par mois ou 150 000 FCFA par an
>
> Aucune donnée n’est perdue : vos produits, vos commandes et vos clients restent conservés.
>
> **[ Choisir mon offre ]**
>
> *Les prix sont ceux de l’offre en vigueur au moment de l’envoi (lus depuis la configuration, jamais écrits en dur).*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E15 — Abonnement expiré : ce qui change

| | |
|---|---|
| **Déclencheur** | Jour de l’expiration, puis J+7 et J+14. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | Votre abonnement PrestAfrik a expiré : voici ce qui change |
| **Pré-en-tête** | Vos données sont conservées. Réactivez en quelques minutes. |
| **Variables** | `{{boutique}}, {{dateExpiration}}, {{dateJ7}}, {{dateJ14}}, {{lien}}` |
| **Règles** | Trois variantes de texte (jour J, J+7, J+14) sur le même modèle. |

**Contenu**

> **Votre abonnement a expiré**
>
> L’abonnement de {{boutique}} a expiré le {{dateExpiration}}. Rassurez-vous : vos données sont conservées.
>
> - Aujourd’hui : vos commandes en cours restent consultables et traitables.
> - À partir du {{dateJ7}} : l’ajout de nouveaux produits et les campagnes sont suspendus.
> - À partir du {{dateJ14}} : votre boutique est mise en pause et ne reçoit plus de nouvelles commandes.
>
> Pour tout remettre en route, il vous suffit de choisir une offre.
>
> **[ Réactiver ma boutique ]**
>
> *Besoin d’aide pour choisir ? Répondez à cet e-mail.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E16 — Paiement confirmé

| | |
|---|---|
| **Déclencheur** | Événement signé du fournisseur de paiement validé côté serveur. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | Paiement confirmé : merci pour votre confiance |
| **Pré-en-tête** | Votre abonnement est actif. |
| **Variables** | `{{boutique}}, {{offre}}, {{periode}}, {{montant}}, {{date}}, {{echeance}}, {{reference}}, {{lien}}` |
| **Règles** | Envoyé uniquement après validation serveur ou événement signé, jamais sur un simple retour de navigateur. |

**Contenu**

> **Merci, votre paiement est confirmé**
>
> Nous avons bien reçu votre paiement. L’abonnement de {{boutique}} est actif.
>
> - Offre : {{offre}} ({{periode}})
> - Montant : {{montant}} FCFA
> - Date : {{date}}
> - Prochaine échéance : {{echeance}}
> - Référence : {{reference}}
>
> **[ Voir mon abonnement ]**
>
> *Conservez ce message comme confirmation de votre paiement d’abonnement.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E17 — Échec du paiement

| | |
|---|---|
| **Déclencheur** | Le fournisseur signale un paiement refusé ou abandonné. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | Votre paiement n’a pas pu aboutir |
| **Pré-en-tête** | Aucun montant n’a été débité. Vous pouvez réessayer. |
| **Variables** | `{{boutique}}, {{motif}}, {{lien}}` |
| **Règles** | Ne pas affirmer qu’un montant a ou n’a pas été débité si le prestataire ne le confirme pas : adapter la phrase au motif reçu. |

**Contenu**

> **Votre paiement n’a pas pu aboutir**
>
> Nous n’avons pas pu valider votre paiement pour l’abonnement de {{boutique}}. Le motif indiqué par le prestataire est : {{motif}}.
>
> Votre boutique n’est pas affectée pour le moment. Vous pouvez réessayer dès maintenant ou choisir un autre moyen de paiement.
>
> **[ Réessayer le paiement ]**
>
> *Si le problème persiste, répondez à cet e-mail : nous vous aiderons à le résoudre.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E18 — Changement d’offre

| | |
|---|---|
| **Déclencheur** | Changement d’offre validé. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | Votre offre PrestAfrik a été mise à jour |
| **Pré-en-tête** | Voici ce qui change pour {{boutique}}. |
| **Variables** | `{{boutique}}, {{offre}}, {{dateEffet}}, {{quotaProduits}}, {{quotaMessages}}, {{quotaMembres}}, {{lien}}` |
| **Règles** | Une montée d’offre est immédiate ; une baisse prend effet à la fin de la période payée. |

**Contenu**

> **Votre nouvelle offre est active**
>
> {{boutique}} est maintenant sur l’offre {{offre}}, à compter du {{dateEffet}}.
>
> - Produits : {{quotaProduits}}
> - Messages WhatsApp par mois : {{quotaMessages}}
> - Membres d’équipe : {{quotaMembres}}
>
> **[ Voir mon abonnement ]**
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E19 — Boutique mise en pause

| | |
|---|---|
| **Déclencheur** | J+14 après l’expiration de l’abonnement. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | {{boutique}} est temporairement en pause |
| **Pré-en-tête** | Réactivez-la à tout moment, vos données sont intactes. |
| **Variables** | `{{boutique}}, {{lien}}` |
| **Règles** | Page publique « Boutique temporairement indisponible ». |

**Contenu**

> **Votre boutique est en pause**
>
> Faute d’abonnement actif, {{boutique}} est temporairement indisponible pour vos clients et ne reçoit plus de nouvelles commandes.
>
> Vos produits, vos clients et vos commandes sont conservés. Vous pouvez toujours traiter les commandes déjà enregistrées.
>
> **[ Réactiver ma boutique ]**
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E20 — Boutique suspendue par l’administration

| | |
|---|---|
| **Déclencheur** | Un administrateur suspend une boutique. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | Votre boutique {{boutique}} a été suspendue |
| **Pré-en-tête** | Voici la raison et comment la rétablir. |
| **Variables** | `{{boutique}}, {{motif}}` |
| **Règles** | Le motif est obligatoire côté administration et journalisé. |

**Contenu**

> **Votre boutique a été suspendue**
>
> Notre équipe a suspendu {{boutique}} pour la raison suivante : {{motif}}.
>
> Pendant la suspension, la boutique n’est plus visible par vos clients. Pour comprendre la situation et la rétablir, répondez simplement à cet e-mail : nous reviendrons vers vous rapidement.
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E21 — Nouvelle commande reçue

| | |
|---|---|
| **Déclencheur** | Une commande est enregistrée (notification facultative, activée par défaut). |
| **Destinataire** | Les membres qui ont activé cette notification. |
| **Objet** | Nouvelle commande {{reference}} sur {{boutique}} |
| **Pré-en-tête** | {{nomClient}} vient de commander pour {{total}}. |
| **Variables** | `{{reference}}, {{boutique}}, {{nomClient}}, {{resume}}, {{total}}, {{ville}}, {{quartier}}, {{lien}}` |
| **Règles** | Jamais le numéro complet ni l’adresse détaillée dans l’e-mail. |

**Contenu**

> **Vous avez une nouvelle commande !**
>
> Bravo ! {{nomClient}} vient de passer la commande {{reference}} sur {{boutique}}.
>
> - Articles : {{resume}}
> - Total : {{total}}
> - Livraison : {{ville}}, {{quartier}}
>
> **[ Voir la commande ]**
>
> *Pour des raisons de confidentialité, le numéro complet du client n’est pas affiché dans cet e-mail.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E22 — Messages WhatsApp échoués

| | |
|---|---|
| **Déclencheur** | Au moins un message du mode API n’a pas pu partir (regroupé, au plus un e-mail par heure). |
| **Destinataire** | Propriétaire et Gestionnaires. |
| **Objet** | {{nombre}} message(s) WhatsApp n’ont pas pu partir |
| **Pré-en-tête** | Vos clients n’ont pas reçu leur demande de confirmation. |
| **Variables** | `{{nombre}}, {{raison}}, {{lien}}` |
| **Règles** | Regrouper par heure pour éviter les rafales. |

**Contenu**

> **Des messages WhatsApp n’ont pas pu partir**
>
> {{nombre}} message(s) de confirmation n’ont pas pu être envoyés à vos clients. Les commandes correspondantes sont bien enregistrées.
>
> Raison la plus fréquente : {{raison}}.
>
> Vous pouvez renvoyer les messages ou contacter les clients directement depuis les commandes concernées.
>
> **[ Voir les messages échoués ]**
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E23 — Quota de messages presque atteint

| | |
|---|---|
| **Déclencheur** | 90 % puis 100 % du quota mensuel de messages. |
| **Destinataire** | Le Propriétaire. |
| **Objet** | Vous avez utilisé {{pourcentage}} % de vos messages WhatsApp |
| **Pré-en-tête** | Pensez à ajuster votre offre. |
| **Variables** | `{{pourcentage}}, {{boutique}}, {{utilises}}, {{quota}}, {{lien}}` |
| **Règles** | Un seul e-mail par palier (90 %, 100 %) et par mois. |

**Contenu**

> **Votre quota de messages approche de sa limite**
>
> {{boutique}} a utilisé {{utilises}} messages sur {{quota}} ce mois-ci. Au-delà, les envois automatiques seront suspendus jusqu’au mois prochain ; vos commandes restent enregistrées dans tous les cas.
>
> Pour envoyer davantage de messages, vous pouvez passer à une offre supérieure.
>
> **[ Changer d’offre ]**
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E24 — Accusé de réception du formulaire de contact

| | |
|---|---|
| **Déclencheur** | Envoi du formulaire de contact de la landing page. |
| **Destinataire** | La personne qui a écrit. |
| **Objet** | Nous avons bien reçu votre message |
| **Pré-en-tête** | Nous vous répondons dès que possible. |
| **Variables** | `{{prenom}}, {{message}}` |
| **Règles** | Protéger contre l’usage du formulaire pour envoyer des e-mails à des tiers : limitation de débit et un seul accusé par adresse et par heure. |

**Contenu**

> **Merci de nous avoir écrit, {{prenom}} !**
>
> Nous avons bien reçu votre message et nous vous répondrons dès que possible, en français, avec plaisir.
>
> Pour mémoire, voici ce que vous nous avez écrit :
>
> > {{message}}
>
> *Vous n’avez pas écrit à PrestAfrik ? Ignorez simplement ce message.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

### E25 — Lien de réinitialisation envoyé par un administrateur

| | |
|---|---|
| **Déclencheur** | Un administrateur déclenche l’envoi depuis la page Utilisateurs. |
| **Destinataire** | Le titulaire du compte. |
| **Objet** | Un conseiller PrestAfrik vous a envoyé un lien pour retrouver l’accès à votre compte |
| **Pré-en-tête** | Ce lien est valable 60 minutes. |
| **Variables** | `{{lien}}` |
| **Règles** | Action d’administration journalisée (qui, quand, quoi). L’administrateur ne voit jamais le mot de passe. |

**Contenu**

> **Retrouvez l’accès à votre compte**
>
> À votre demande, un conseiller PrestAfrik vous a envoyé ce lien pour choisir un nouveau mot de passe (8 caractères minimum).
>
> Ce lien est valable 60 minutes et ne peut servir qu’une seule fois.
>
> **[ Choisir un nouveau mot de passe ]**
>
> *Vous n’avez fait aucune demande ? Répondez à cet e-mail : nous vérifierons votre compte.*
>
> À très bientôt,  
> L’équipe PrestAfrik

---

## 6. Variantes et déclinaisons

- **E14** : trois envois (J-7, J-3, J-1) avec `{{jours}}` = 7, 3, 1. À J-1, le ton reste serein mais l’objet devient « Votre essai gratuit PrestAfrik se termine demain ».
- **E15** : trois textes sur le même modèle, **jour J**, **J+7** et **J+14**, qui mettent en avant la phase en cours (voir le brief, §6.10).
- **E21** : version « résumé » possible (un e-mail par heure) si la boutique reçoit beaucoup de commandes.
- **Alertes d’administration** (messages échoués, alertes, suspensions) : e-mails internes à l’équipe PrestAfrik, **sans** aucune donnée personnelle de client.

## 7. Informations à confirmer par le propriétaire du produit

1. Adresses d’expédition et de réponse (`ne-pas-repondre@…`, `contact@…`).
2. Prestataire d’envoi d’e-mails (SMTP ou API) et pays d’hébergement des données (voir la section conformité du brief).
3. Textes légaux à lier dans le pied de page (conditions, confidentialité).
4. Prix et quotas à afficher dans E14 et E18 (lus depuis la configuration des offres).
