# PrestAfrik

PrestAfrik est une plateforme de création et de gestion de boutiques en ligne, pensée d’abord pour les vendeurs camerounais. Le développement suit les étapes fonctionnelles décrites dans [`instruction.md`](./instruction.md) ; l’interface d’inscription et l’espace initial reprennent les maquettes fournies.

## Stack retenue

- Next.js 16.4.0 avec App Router, React 19.3.0 et TypeScript strict.
- PostgreSQL et Prisma 6.12.0.
- Better Auth 1.7.7 pour les comptes, les sessions, la vérification d’e-mail et la récupération de compte.
- Tailwind CSS 4.3.3, tokens CSS partagés et Zod 4.6.5.
- Vitest 5.0.3 pour les tests unitaires ; Playwright 1.64.0 pour les parcours navigateur.
- Node.js 20.9 ou supérieur.

## Démarrage

1. Installe Node.js 20.9+ et npm.
2. Crée un projet PostgreSQL dans Supabase (ou utilise un PostgreSQL local).
3. Copie `.env.example` en `.env`, puis renseigne `DATABASE_URL`, `DIRECT_URL` et un `BETTER_AUTH_SECRET` aléatoire d’au moins 32 caractères. Ces variables restent côté serveur.
4. Installe et prépare le projet :

   ```powershell
   npm install
   npm run db:generate
   npm run db:deploy
   npm run dev
   ```

5. Ouvre `http://localhost:3000/inscription`. L’inscription crée un compte ; en développement, le lien de vérification apparaît dans la boîte locale à `/dev/mailbox`.

Pour tester sur un téléphone connecté au même Wi-Fi, arrête puis redémarre le serveur avec `npm run dev` afin que la configuration du réseau local soit prise en compte, trouve l’adresse IPv4 privée de ton PC avec `ipconfig`, puis ouvre `http://ADRESSE-IP-DU-PC:3000` sur le téléphone. Autorise Node.js sur le réseau privé si le pare-feu Windows le demande. N’utilise pas `localhost` sur le téléphone : cette adresse désigne le téléphone lui-même.

Pour une première création de schéma, après avoir configuré `.env`, utilise `npm run db:migrate -- --name initial`. Pour les migrations déjà générées, `npm run db:deploy` les applique.

## Base locale pour les tests et la revue visuelle

La base de `.env` peut contenir de vrais comptes : n’y chargez jamais les données de démonstration. Une base PostgreSQL 16 locale, sans Docker, est fournie :

```powershell
node scripts/local-db.mjs          # laisse tourner (port 54329)
$env:DATABASE_URL = "postgresql://prestafrik:prestafrik@localhost:54329/prestafrik"
$env:DIRECT_URL = $env:DATABASE_URL
npx prisma migrate deploy
$env:ALLOW_DEMO_SEED = "true"; $env:SEED_DEMO_PASSWORD = "Demo-PrestAfrik-2026"
npm run db:seed                    # 5 boutiques, 60 produits, 100 clients, 180 commandes
npx next dev                       # avec les mêmes variables
```

Connexion de démonstration : `vendeur1@example.test` (Mboa Style) avec `SEED_DEMO_PASSWORD`. Le seed refuse une base distante.

## Données de démonstration

Le seed crée cinq boutiques et dix membres fictifs. Il ne crée aucun compte avec un mot de passe connu et n’envoie aucun message.

Dans PowerShell, active le seed uniquement sur une base locale de démonstration :

```powershell
$env:ALLOW_DEMO_SEED = "true"
npm run db:seed
Remove-Item Env:ALLOW_DEMO_SEED
```

Le seed refuse systématiquement de s’exécuter lorsque `NODE_ENV=production`. Les e-mails utilisent le domaine réservé `example.com`.

## Vérifications

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Les tests de navigateur utilisent Chromium et démarrent Next.js automatiquement. Si le navigateur Playwright n’est pas présent sur la machine, installe-le avec `npx playwright install chromium`.

## Documentation

- [`docs/implementation-status.md`](./docs/implementation-status.md) : état réel par étape, simulations et limites.
- [`docs/design-system.md`](./docs/design-system.md) : palette, tokens et adaptation visuelle.
- [`instruction.md`](./instruction.md) : consignes fonctionnelles et ordre de réalisation.

Le catalogue, la vitrine, la personnalisation et les fondations du panier/checkout sont disponibles, mais les commandes vendeur, le CRM, les intégrations WhatsApp, la livraison, les paiements et les abonnements restent incomplets. Consulte [`docs/implementation-status.md`](./docs/implementation-status.md) pour connaître les limites exactes ; ne considère pas ces fondations comme une plateforme prête pour la production.
