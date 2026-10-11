Tu es un ingénieur full-stack senior, architecte logiciel et designer produit.

Ta mission est de développer PrestAfrik, un SaaS de création de boutiques en ligne destiné en priorité aux vendeurs camerounais.

Je veux une application réellement fonctionnelle, pas une maquette avec des boutons sans action, ni un dashboard alimenté uniquement par des tableaux JavaScript.

Construis le projet progressivement, avec un backend complet, une base de données relationnelle, des données fictives réalistes, des tests et une documentation compréhensible.

==================================================
1. OBJECTIF DU PRODUIT
==================================================

PrestAfrik permet à un vendeur de :

- Créer sa boutique.
- Personnaliser son apparence.
- Ajouter et gérer ses produits.
- Recevoir des commandes entièrement sur son site.
- Demander automatiquement au client de confirmer sa commande sur WhatsApp.
- Gérer ses clients dans un CRM.
- Organiser ses livraisons.
- Suivre ses encaissements.
- Souscrire à un abonnement mensuel ou annuel.

Le client doit pouvoir commander sans créer de compte.

Le paiement à la livraison est le mode principal.

Le numéro WhatsApp du client est obligatoire pour commander.

L’IA intégrée au produit ne fait pas partie de cette première version :
- Pas de génération de descriptions par IA.
- Pas de chatbot IA.
- Pas de fournisseur IA à installer.
- Pas de boutons IA fictifs.

Priorité :
1. Fonctionnalités fiables.
2. Sécurité et isolation des boutiques.
3. Code lisible et maintenable.
4. Expérience mobile.
5. Design agréable et facilement remplaçable.

==================================================
2. MÉTHODE DE TRAVAIL
==================================================

Utilise le dossier actuelle pour le projet

Ne pose des questions que pour les décisions bloquantes.
Pour les autres choix, prends une décision raisonnable et documente-la.

Travaille par étapes cohérentes.
Ne tente pas de produire tout le SaaS dans une seule réponse.

Après chaque étape :
- Indique ce qui est réellement terminé.
- Exécute les vérifications disponibles.
- Signale les tests réussis, échoués ou non exécutés.
- Explique comment tester la fonctionnalité.
- Mets à jour la documentation et la checklist.

Ne prétends jamais qu’une intégration externe fonctionne si elle utilise encore un simulateur.

Ne laisse pas de TODO silencieux dans les parcours critiques.

==================================================
3. STACK ET ARCHITECTURE
==================================================

Utilise :

- Next.js avec App Router.
- React.
- TypeScript en mode strict.
- PostgreSQL.
- Prisma.
- Tailwind CSS.
- Zod pour la validation.
- Une bibliothèque d’authentification maintenue et compatible avec la stack.
- Une solution de tests unitaires.
- Playwright pour les parcours de bout en bout.

Choisis des versions stables et compatibles.
Documente les versions retenues.

Architecture :

- Monolithe modulaire.
- Logique métier séparée de l’interface.
- Composants serveur par défaut lorsque pertinent.
- Composants client uniquement quand nécessaires.
- Services métier indépendants des composants React.
- Accès à la base centralisé.
- Adaptateurs pour les services externes.
- Worker et file durable pour les messages asynchrones.

Pour le développement :
- PostgreSQL via Supabase, configuré avec des URL serveur dans `.env`.
- Infrastructure de file d’attente documentée.
- Stockage local de développement ou stockage objet local.
- Aucun service payant obligatoire pour tester le produit.

Structure indicative :

src/
  app/
  components/
    ui/
    layout/
    shared/
  modules/
    auth/
    stores/
    catalog/
    orders/
    customers/
    messaging/
    delivery/
    payments/
    subscriptions/
    analytics/
    admin/
  lib/
  styles/
  config/
  types/

prisma/
  schema.prisma
  migrations/
  seed/

workers/
tests/
docs/

Adapte cette structure si nécessaire, sans multiplier inutilement les dossiers.

Évite :
- Les fichiers gigantesques.
- La logique métier directement dans les pages.
- Les composants dupliqués.
- Les types any injustifiés.
- Les abstractions complexes sans besoin concret.
- Les appels directs à un fournisseur dispersés dans le code.

==================================================
4. APPLICATION MULTI-BOUTIQUES
==================================================

Plusieurs vendeurs utilisent la même plateforme.

Chaque boutique possède :
- Ses produits.
- Ses clients.
- Ses commandes.
- Ses paramètres.
- Ses consentements.
- Ses messages.
- Son abonnement.
- Ses fichiers.

Toutes les opérations doivent vérifier côté serveur :
- L’utilisateur connecté.
- Son appartenance à la boutique.
- Son rôle.
- Ses permissions.

Ne fais jamais confiance au storeId envoyé par le navigateur.

Empêche les accès croisés entre boutiques dans :
- Les lectures.
- Les modifications.
- Les exports.
- Les fichiers.
- Les tâches asynchrones.
- Les caches.
- Les webhooks.

Ajoute des tests explicites d’isolation.

Un utilisateur peut appartenir à plusieurs boutiques.
Prévois un sélecteur de boutique dans son espace.

En local, les boutiques publiques peuvent être accessibles par :
/boutique/[slug]

Prépare un mécanisme de résolution des domaines et sous-domaines,
sans rendre leur configuration obligatoire pour démarrer.

==================================================
5. AUTHENTIFICATION ET RÔLES
==================================================

Implémente :

- Inscription.
- Connexion.
- Déconnexion.
- Récupération de compte.
- Vérification de contact selon la solution choisie.
- Gestion des sessions.
- Invitations de collaborateurs.

Rôles de boutique :
- Propriétaire.
- Gestionnaire.
- Préparateur de commandes.

Rôle plateforme :
- Administrateur PrestAfrik.

Définis une matrice de permissions explicite.

Le client acheteur n’est pas obligé de créer un compte.

En développement, utilise un service de messagerie simulé
ou une boîte de réception locale pour tester les liens de connexion
et de récupération.

Aucun mot de passe ou secret réel ne doit être ajouté au dépôt.

==================================================
6. CRÉATION ET PERSONNALISATION DE BOUTIQUE
==================================================

Assistant de création :

1. Nom de la boutique.
2. Activité.
3. Ville.
4. Coordonnées.
5. Thème.
6. Couleurs.
7. Premier produit facultatif.
8. Publication.

La page Boutique est créée par défaut.
Elle constitue la page principale du site marchand.

Elle comprend :
- Identité de la boutique.
- Bannière facultative.
- Recherche.
- Catégories.
- Catalogue.
- Produits mis en avant.
- Informations de livraison.
- Contact.
- Pied de page.

Pages éditoriales facultatives :
- À propos.
- Contact.
- FAQ.
- Page promotionnelle.

Les écrans indispensables à la commande restent présents :
- Produit.
- Panier.
- Formulaire.
- Résultat de commande.
- Suivi sécurisé.

Les informations nécessaires de vente et de confidentialité
doivent rester accessibles.

Prévois trois thèmes utilisant les mêmes fonctionnalités :
- Catalogue express.
- Mode et beauté.
- Boutique de marque.

Le changement de thème ne doit jamais effacer :
- Les produits.
- Les commandes.
- Les clients.
- Les pages.
- Les réglages métier.

Le CMS fonctionne avec des blocs structurés.
Pas de HTML ou JavaScript arbitraire exécuté depuis la base.

==================================================
7. DESIGN MODIFIABLE ET VARIABLES GLOBALES
==================================================

Je veux pouvoir refaire le design sans réécrire le backend.

Sépare :
- Logique métier.
- Structure des pages.
- Composants visuels.
- Tokens de design.

Crée un fichier central :
src/styles/tokens.css

Définis au minimum :

:root {
  --color-brand-primary: #176B52;
  --color-brand-secondary: #F4B942;
  --color-brand-accent: #EF765E;

  --color-page-background: #F7F8F4;
  --color-surface: #FFFFFF;
  --color-surface-muted: #EEF2ED;

  --color-text-primary: #17251F;
  --color-text-secondary: #53645B;
  --color-border: #DCE5DE;

  --color-success: #207A49;
  --color-warning: #A86305;
  --color-danger: #C93636;
  --color-info: #2563EB;

  --color-on-primary: #FFFFFF;
  --color-on-secondary: #17251F;

  --radius-sm: 0.5rem;
  --radius-md: 0.875rem;
  --radius-lg: 1.25rem;

  --shadow-card: 0 8px 24px rgb(23 37 31 / 0.06);

  --spacing-page-mobile: 1rem;
  --spacing-page-desktop: 2rem;

  --font-body: sans-serif;
  --font-heading: sans-serif;
}

Ces couleurs constituent une proposition initiale.
Vérifie les contrastes, notamment pour les textes et boutons.

Ne disperse pas de couleurs hexadécimales dans les composants.
Connecte les classes Tailwind aux variables CSS.

Prévois :
- Tokens globaux PrestAfrik.
- Tokens spécifiques aux boutiques.
- Surcharge limitée au conteneur de la boutique.
- Validation des couleurs personnalisées.
- Couleur de texte adaptée aux boutons.
- Aperçu avant publication.
- Retour aux couleurs par défaut.

Documente dans docs/design-system.md :
- Le rôle de chaque variable.
- Où changer les couleurs.
- Comment ajouter un thème.
- Comment modifier les arrondis et espacements.
- Comment éviter d’impacter toutes les boutiques.

Composants réutilisables :
- Button.
- Input.
- Select.
- Textarea.
- Card.
- Badge.
- Dialog.
- Drawer.
- Tabs.
- Table.
- EmptyState.
- LoadingState.
- ErrorState.
- Pagination.
- StatCard.
- ConfirmDialog.

Prévois les états :
- Chargement.
- Vide.
- Erreur.
- Succès.
- Désactivé.

==================================================
8. TON ET TOUCHE FUN
==================================================

L’interface doit être chaleureuse, simple et professionnelle.

Utilise un français facile à comprendre.
Évite le vocabulaire technique dans l’interface.

Exemples :
- « Mes produits » plutôt que « Inventaire SKU ».
- « Argent reçu » plutôt que « Settlement ».
- « Commandes à confirmer » plutôt que « Pending fulfillment ».
- « Mon équipe » plutôt que « RBAC ».
- « Livraison à organiser » plutôt que « Dispatch queue ».

Ajoute une touche fun dans :
- L’accueil.
- Les états vides.
- La publication de boutique.
- Les messages de réussite.

Exemples :
- « Ta boutique prend vie ! »
- « Tes prochains clients t’attendent. »
- « Premier produit ajouté. On avance ! »
- « Tout est prêt : partage ta boutique. »

Pas de caricature culturelle.
Pas d’argot forcé.
Pas d’emojis dans les messages sensibles de paiement,
de sécurité ou d’erreur.

Choisis une convention cohérente :
- Ton chaleureux au vendeur.
- Ton respectueux au client.

Centralise les textes visibles pour faciliter les modifications
et une future traduction anglaise.

==================================================
9. CATALOGUE
==================================================

Implémente :

- Création, modification et archivage.
- Catégories.
- Photos.
- Prix en XAF.
- Prix promotionnel facultatif.
- Variantes.
- Référence produit.
- Stock suivi ou disponibilité simple.
- Produit disponible, épuisé ou sur commande.
- Recherche et filtres.
- Pagination.
- Import CSV avec aperçu et rapport d’erreurs.
- Export CSV.

Stocke les montants XAF comme des entiers.
Ne calcule pas les montants financiers avec des flottants.

Valide :
- Prix non négatif.
- Quantité correcte.
- Variantes existantes.
- Appartenance à la boutique.
- Disponibilité.

Les images doivent être limitées en taille,
validées et optimisées.

Les exports doivent éviter l’injection de formules dans les fichiers CSV.

==================================================
10. COMMANDES ENTIÈREMENT SUR LE SITE
==================================================

Deux parcours :
- Commande rapide d’un produit.
- Panier avec plusieurs produits.

Formulaire :
- Nom.
- Numéro WhatsApp obligatoire.
- Ville.
- Quartier.
- Point de repère.
- Livraison ou retrait à la boutique.
- Commentaire facultatif.
- E-mail facultatif.
- Consentement au suivi WhatsApp.
- Consentement marketing séparé et facultatif.

Propose +237 par défaut.
Normalise le téléphone au format international.

Ne présente pas une validation de format comme une preuve
que le numéro appartient au client ou possède WhatsApp.

Au moment de la soumission :

1. Valider les données côté serveur.
2. Recalculer les prix depuis la base.
3. Vérifier produits, variantes et disponibilité.
4. Vérifier la zone de livraison.
5. Calculer les frais connus.
6. Créer la commande.
7. Créer ou enrichir le client.
8. Enregistrer les consentements.
9. Créer l’événement d’envoi WhatsApp.
10. Afficher le résultat.

Utilise une transaction et un mécanisme d’outbox.

Préviens les doublons avec une clé d’idempotence.

Conserve une copie des éléments commandés :
- Nom.
- Variante.
- Prix.
- Quantité.
- Remise.
- Frais.
- Adresse.

Une modification du produit ne modifie pas l’historique.

Si les frais sont inconnus :
- Afficher « Frais de livraison à confirmer ».
- Ne pas présenter un total définitif.
- Exiger une nouvelle validation si le montant change.

La commande est enregistrée même si WhatsApp échoue.

==================================================
11. CONFIRMATION WHATSAPP
==================================================

Crée une interface fournisseur :

MessagingProvider
- sendOrderConfirmation()
- sendOrderUpdate()
- verifyWebhook()
- parseWebhook()

Implémente :
- Un adaptateur officiel configurable.
- Un adaptateur simulé pour le développement.

Le simulateur doit être identifié clairement.
Il ne doit pas prétendre envoyer de vrais messages.

Prévois :
- Connexion WhatsApp par boutique.
- Identifiant du numéro.
- Référence du modèle approuvé.
- Secrets stockés de manière sécurisée.
- État de configuration.
- Journal des messages.
- Webhooks.
- Retries limités.
- Déduplication.
- Alertes en cas d’échec.

Vérifie les règles officielles en vigueur avant d’implémenter
l’intégration de production.

Ne considère pas le formulaire web comme l’ouverture
d’une conversation WhatsApp.

Message proposé :

« Bonjour [prénom], [boutique] a enregistré votre commande
[référence].

Articles : [résumé].
Montant : [montant ou montant à confirmer].
Livraison : [ville], [quartier], [repère].

Confirmez-vous votre commande et ce lieu de livraison ? »

Actions selon les possibilités du modèle :
- Confirmer.
- Modifier la livraison.
- Annuler.

Prévois un lien sécurisé de secours vers le site.

La confirmation doit être associée à une commande précise.
Une réponse ambiguë ne confirme rien automatiquement.

Distingue :
- Message en attente.
- Message envoyé.
- Message livré.
- Message lu si disponible.
- Message échoué.
- Commande confirmée par le client.

Un message lu n’est pas une confirmation.

En développement, crée un panneau permettant de simuler :
- Livraison du message.
- Confirmation.
- Modification demandée.
- Annulation.
- Échec.
- Webhook reçu deux fois.

Ce panneau est interdit en production.

==================================================
12. STATUTS ET LIVRAISON
==================================================

Sépare les états.

Confirmation client :
- En attente.
- Confirmée.
- Modification demandée.
- Refusée.
- Expirée.

Traitement vendeur :
- À vérifier.
- Acceptée.
- En préparation.
- Terminée.
- Annulée.

Livraison :
- À organiser.
- En cours.
- Livrée.
- Échouée.
- Retournée.

Paiement :
- En attente.
- Partiel.
- Payé.
- Remboursé.

Définis les transitions autorisées.
Journalise les changements.

Le vendeur configure :
- Villes.
- Zones.
- Frais.
- Délais indicatifs.
- Retrait.
- Zones nécessitant validation.

Prévois une réservation de stock temporaire documentée,
avec libération à expiration ou annulation.

Gère la concurrence pour éviter de vendre deux fois
la dernière unité.

Une commande livrée n’est pas automatiquement encaissée.

==================================================
13. CRM COMPLET
==================================================

Chaque commande enrichit le CRM de sa boutique.

Fiche client :
- Nom.
- WhatsApp normalisé.
- E-mail facultatif.
- Adresses.
- Historique des commandes.
- Montants commandés et encaissés.
- Première et dernière commande.
- Tags.
- Notes.
- Source.
- Consentements.
- Historique d’interactions.

Déduplication :
- Par boutique et téléphone.
- Pas de fusion entre boutiques.
- Gestion manuelle des cas ambigus.

Fonctions :
- Recherche.
- Filtres.
- Segments.
- Notes.
- Tags.
- Export autorisé.
- Liste des clients à recontacter.
- Rappels manuels.

Segments :
- Nouveaux clients.
- Clients réguliers.
- Commandes non confirmées.
- Clients inactifs.
- Acheteurs par catégorie.

Marketing :
- Consentement distinct.
- Désinscription.
- Aucun envoi sans autorisation.
- Brouillons de campagnes.
- Aperçu.
- Audience.
- Budget ou quota.
- Confirmation explicite avant envoi.

Si l’intégration réelle n’est pas configurée,
les campagnes fonctionnent uniquement en simulation clairement affichée.

==================================================
14. ENCAISSEMENTS ET TABLEAU DE BORD
==================================================

Permets d’enregistrer :
- Paiement reçu.
- Paiement partiel.
- Collecte par livreur.
- Reversement au vendeur.
- Remboursement.

Journalise :
- Montant.
- Date.
- Méthode.
- Auteur.
- Référence.
- Note facultative.

N’affiche pas toutes les commandes comme du chiffre encaissé.

Dashboard :
- Commandes à confirmer.
- Commandes à accepter.
- Livraisons à organiser.
- Messages échoués.
- Produits épuisés.
- Montant confirmé.
- Argent reçu.
- Argent restant à recevoir.
- Sommes collectées non reversées.
- Clients réguliers.

Filtres :
- Aujourd’hui.
- Sept derniers jours.
- Mois en cours.
- Période personnalisée.

Toutes les statistiques doivent venir de la base.
Explique leur définition dans la documentation.

==================================================
15. ABONNEMENTS
==================================================

Essai gratuit d’un mois.
Pas d’offre gratuite permanente.

Définis précisément le calcul d’un mois calendaire
et teste les fins de mois.

Offres initiales configurables :
- Essentiel : 3 000 FCFA/mois, 30 000 FCFA/an.
- Business : 7 500 FCFA/mois, 75 000 FCFA/an.
- Pro : 15 000 FCFA/mois, 150 000 FCFA/an.

Affiche le pourcentage économisé l'année

Ce sont des prix de démonstration, modifiables.

Fonctions :
- Essai.
- Choix mensuel ou annuel.
- Échéance.
- Historique.
- Quotas.
- Changement d’offre.
- Expiration.
- Restriction progressive.
- Rappels.

Toutes les offres doivent pouvoir utiliser la confirmation
WhatsApp si la connexion est active et le quota disponible.

Crée un adaptateur de paiement d’abonnement :
- Fournisseur réel configurable.
- Simulateur local.

Ne marque jamais un paiement comme réussi
uniquement sur la base d’un retour navigateur.

Prévois la validation serveur et les événements du fournisseur.

En l’absence de prestataire configuré,
affiche clairement le mode démonstration.

Documente les règles pour les commandes ouvertes
lorsqu’un abonnement expire.

==================================================
16. INNOVATIONS SANS IA
==================================================

Implémente des fonctionnalités utiles :

- QR code de boutique.
- QR code de produit.
- Lien partageable par produit.
- Aperçu du message de partage.
- Checklist de démarrage vendeur.
- Liste quotidienne des actions prioritaires.
- Réachat depuis une ancienne commande avec prix actualisés.
- Favoris locaux côté client.
- Suivi de commande sans compte.
- Rappels vendeur.
- Détection des commandes en double probables.
- Historique des modifications.
- Reçu ou récapitulatif imprimable.

Une alerte de doublon ne doit pas supprimer automatiquement
une commande légitime.

Les liens de suivi doivent être non devinables,
limités et sécurisés.

==================================================
17. DONNÉES FICTIVES RÉALISTES
==================================================

Crée un seed déterministe et relançable.

Prévois au minimum :
- 5 boutiques fictives.
- 10 utilisateurs et leurs rôles.
- 60 produits.
- Plusieurs variantes.
- 100 clients.
- 180 commandes.
- Des livraisons.
- Des paiements partiels.
- Des collectes par livreur.
- Des abonnements à différents états.
- Des messages simulés.
- Des notes CRM et consentements.

Exemples de boutiques fictives :
- Mboa Style.
- Douala Maison.
- Yaoundé Beauté.
- Bafoussam Créations.
- Kribi Accessoires.

Couvre :
- Commande non confirmée.
- Commande confirmée.
- Adresse à corriger.
- Annulation.
- Livraison réussie.
- Livraison échouée.
- Paiement partiel.
- Produit épuisé.
- Variante.
- Frais à confirmer.
- Essai actif.
- Essai expiré.
- Abonnement mensuel et annuel.

Les données sont entièrement fictives.
N’utilise aucun vrai contact client.

Utilise des e-mails de démonstration.
Les identifiants de contact du seed doivent être protégés
contre tout envoi réel.

Le seed et les tests ne doivent jamais déclencher
des messages ou paiements réels, même si des secrets
de production existent dans l’environnement.

Rends les calculs cohérents :
- Totaux.
- Stocks.
- Encaissements.
- Statuts.
- Dates.
- Quotas.

Ne stocke pas de faux contacts dans un système de production.

==================================================
18. SÉCURITÉ ET TESTS
==================================================

Implémente :
- Validation serveur.
- Contrôle des permissions.
- Rate limiting.
- Protection des uploads.
- Protection des webhooks.
- Gestion des secrets.
- Logs sans données sensibles inutiles.
- Sauvegardes documentées.
- Liens signés.
- Protections adaptées contre CSRF et XSS.
- Gestion d’erreur sans exposer les détails internes.

Tests prioritaires :
- Isolation des boutiques.
- Permissions.
- Prix recalculés.
- Double soumission.
- Concurrence de stock.
- CRM sans doublon normal.
- Consentement marketing.
- Webhook dupliqué.
- Échec WhatsApp.
- Confirmation rattachée à la bonne commande.
- Paiement partiel.
- Abonnement expiré.
- Modification d’adresse.
- Accès au suivi non autorisé.

Parcours Playwright :
1. Création de boutique.
2. Ajout de produit.
3. Commande client.
4. Confirmation simulée.
5. Acceptation vendeur.
6. Livraison.
7. Encaissement.
8. Vérification du CRM.

==================================================
19. DOCUMENTATION ET LIVRABLES
==================================================

Livre :

- Code de l’application.
- Schéma Prisma.
- Migrations.
- Seed.
- Guide de configuration Supabase.
- .env.example sans secrets.
- Scripts de démarrage.
- Tests.
- README.
- Guide des couleurs.
- Guide des intégrations.
- Guide de déploiement.
- Liste des fonctionnalités et de leur état.

Documente les commandes pour :
- Installer.
- Démarrer les services.
- Migrer.
- Remplir la base.
- Lancer l’application.
- Lancer le worker.
- Tester.
- Construire la version production.

Crée docs/implementation-status.md avec :
- Terminé et testé.
- Terminé non testé.
- Simulé.
- Bloqué par configuration externe.
- Non implémenté.

Ne présente pas une fonctionnalité simulée comme prête
pour la production.

==================================================
20. ORDRE D’EXÉCUTION
==================================================

Étape 1 :
Architecture, initialisation, tokens, base, authentification,
multi-boutiques et seed initial.

Étape 2 :
Catalogue, page Boutique, thèmes et personnalisation.

Étape 3 :
Panier, commandes, CRM, stock et validations.

Étape 4 :
File d’envoi, simulateur WhatsApp, confirmation,
adaptateur officiel et webhooks.

Étape 5 :
Livraison, encaissements et dashboard.

Étape 6 :
Abonnements, quotas et administration plateforme.

Étape 7 :
Marketing, innovations sans IA et import/export.

Étape 8 :
Tests complets, sécurité, documentation et préparation
au déploiement.

Commence maintenant par inspecter le dépôt,
présenter le plan et implémenter l’étape 1.

Ne t’arrête pas à une proposition d’architecture :
produis les fichiers et rends chaque étape exécutable.