# Maquettes : méthode de lecture

Les exports du dossier `PrestAfrik maquettes UX UI/` sont des pages « bundler » qui se décompressent en JavaScript. Chaque écran est une `section.board` contenant un titre et une `iframe`.

- `node scripts/design/extract.mjs` : ouvre chaque export avec Playwright (Chromium), isole chaque `section.board > iframe` et écrit dans `docs/design/reference/<page>/<écran>/` la capture (`capture.png`), le texte visible (`texte.txt`) et le HTML (`ecran.html`). Aucune ressource n'était en erreur lors de l'extraction ; la silhouette de l'Afrique (`afrique-mask.png`) et le logo sont dans `public/brand/`.
- `node scripts/design/clean.mjs` : produit `structure.html`, le corps de l'écran sans scripts ni images base64, pratique pour relever les valeurs (couleurs, tailles, espacements).
- `node scripts/design/compare.mjs <route> <page/écran> --state=storage/design-session.json` : planche maquette / application au même viewport dans `docs/design/comparaison/`.
- `node scripts/design/login.mjs` : ouvre une session de démonstration (base locale uniquement) pour les captures.
