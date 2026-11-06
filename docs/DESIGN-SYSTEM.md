# IronLog — RAW PERFORMANCE

L'interface associe des surfaces claires, des filets et une grille dense aux usages de l'entraînement. Les captures de référence ACT ont guidé la hiérarchie éditoriale, sans reprise de ses images ni de son identité.

## Couleurs

Tokens définis dans `src/tokens.css` : fond `#f0eee9`, surface `#f7f5f0`, surface secondaire `#e6e2da`, texte `#181715`, texte secondaire `#514d48`, filet `#c4bfb6`, primaire `#201d1a`, texte primaire `#f4efe7`, accent foncé `#5e4c43`, terracotta `#a45f49`. Les contrastes des associations principales sont couverts par `tests/contrast.test.ts`. Les accents portent la progression et la sélection ; les actions principales sont sombres.

## Typographie

Archivo (400, 600, 700 et 800) pour les titres et commandes ; IBM Plex Mono (400 et 600) pour les données et métadonnées. Les deux familles sont fournies localement par les paquets Fontsource sous licence SIL Open Font License ; les fallbacks sont Arial et Courier New. Les titres sont mis en capitales par CSS, sans modifier les valeurs enregistrées. Chiffres tabulaires dans les tableaux et le calendrier.

## Composition et composants

Espacements de référence 4, 8, 12, 16, 24 et 32 px. Boutons, champs et panneaux rectangulaires ; filets plutôt que cartes épaisses. Le bouton primaire est noir avec texte crème, le secondaire transparent et bordé. Les sections de l'accueil et les activités sont ouvertes ; les statistiques sont présentées en grille. La navigation utilise un filet actif. Les zones tactiles principales font au moins 44 px et le focus clavier est visible.

Sport conserve trois cellules et les roues. Détail conserve le tableau, les états accessibles et le défilement ; une coche distingue une série terminée. Le calendrier garde son modèle et ses interactions, avec point prévu et point enregistré distincts. Les modales, le chrono, les graphiques et les exports partagent la palette ; le mode photo du partage conserve un voile sombre pour la lisibilité sur l'image.

## Responsive et limites

Les zones iOS et la hauteur visuelle restent gérées par les mécanismes de PR 002. À petite hauteur, la séance et ses commandes défilent. Les captures Chromium 375 × 667 et 393 × 852 sont dans `docs/captures/design-v3/`. Les tests automatisés ne remplacent pas une vérification sur Safari iPhone ; en particulier le clavier, les safe areas réelles et le mode installé restent à confirmer.
