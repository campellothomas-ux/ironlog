# IronLog

Migration progressive du prototype V4, sans réécriture des écrans. Voir [l'audit](docs/AUDIT-V4.md).

Node 24 recommandé (22 minimum).

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npx playwright install webkit
npm run test:e2e
```

Le build se trouve dans `dist/`. `npm run preview` permet de le servir localement. Les tests WebKit utilisent une fenêtre mobile 393 × 852 ; ils ne remplacent pas une validation sur un iPhone physique.

## Données

Même clé et structure locale que V4. Avant tout changement de domaine, exporter la sauvegarde dans Vous > Plus et l'importer sur le nouveau domaine. Ne pas réinitialiser les données existantes pour migrer. Les exports contiennent des données personnelles : ne pas les committer. Pas de backend ni de secret requis pour ce lot.

## Netlify — test distinct

`netlify.toml` configure `npm run build` et `dist`. Créer un **site Netlify de test séparé**, connecté à ce dépôt, avec `feat/foundation-session-completion` comme branche du site de test ; activer les Deploy Previews pour les PR. Ne pas connecter cette branche à une application de production existante. Aucun site n'est créé ou déployé par ce dépôt seul.

Pour une prévisualisation à la demande : `npm run build`, puis `npx netlify-cli deploy --dir=dist` en sélectionnant explicitement le site de test. Ne pas utiliser `--prod`. La création effective du site nécessite un accès Netlify qui n'est pas configuré dans cette session.

## Validation avant fusion

CI : lint, tests unitaires, build et parcours WebKit. Manuellement sur Safari iPhone : sauvegarde V4 importée, roues tactiles, repos, retour entre modes et fin de séance, vérification après rechargement, partage. Publier en production seulement après validation explicite.

## PR 002 : interface et calendrier

Palette et tailles partagées dans `src/tokens.css`. Le calendrier ne choisit aucune date de départ automatiquement : ouvrir Programme > Planning, choisir le début de la semaine 1 et confirmer. Voir [le modèle et la compatibilité](docs/CALENDAR.md).

Les tests E2E couvrent 375 × 667, 390 × 844, 393 × 852, 430 × 932 et 1280 × 900. `npm run test:e2e` utilise WebKit par défaut. Si seul Chromium système est disponible :

```sh
IRONLOG_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
TZ=Europe/Paris npm test
TZ=America/New_York npm test
```

Cette alternative Chromium ne valide pas Safari. Les captures de tests sont dans `test-results/` ; celles de revue dans `docs/captures/pr002/`.
