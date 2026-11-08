# PR #7 — Dark Performance : interface monochrome et suppression des programmes

## Direction visuelle

L'application utilise exclusivement des gris neutres et des valeurs achromatiques. **Aucune teinte brune ou rose** : les anciennes couleurs d'accent (y compris `#B58D79`) sont abandonnées.

| Élément | Couleur |
|---|---|
| Fond | `#262626` |
| Surface | `#303030` |
| Surface relevée | `#3A3A3A` |
| Bordure | `#555555` |
| Texte principal | `#F0F0F0` |
| Texte secondaire | `#C5C5C5` |
| Accent | `#E3E3E3` |

Les couleurs d'application viennent des variables `src/tokens.css`. Les graphiques SVG, la carte musculaire et les rendus de partage utilisent eux aussi des valeurs grises. La page, les éléments de formulaire et les métadonnées PWA utilisent le thème sombre ; les identifiants `manifest.id`, `scope`, `start_url` et la clé localStorage restent inchangés.

## Écran Séance

La vue principale n'affiche plus de bloc « Consignes et démonstration » ni les deux boutons Sport / Détail. La séparation sous le titre de l'exercice est retirée et aucune vignette ou placeholder décoratif n'occupe cet espace.

Le bouton ⓘ ouvre la fiche de l'exercice **avec les conseils immédiatement visibles**, et conserve les informations musculaires, les médias disponibles et les dernières performances. Les consignes continuent d'être accessibles dans la préparation guidée.

Un **bouton carré 44 × 44 px** `role="switch"`, placé directement **à côté de ⇄ Remplacer et ⓘ Informations**, affiche une seule valeur : `ON` ou `OFF`. Il n'a pas de ligne ni de légende en dessous ; son nom accessible reste « Mode sport ».
- ON : vue Sport avec une série à la fois et les roues de saisie ;
- OFF : vue Détail avec toutes les séries modifiables.

Sur les exercices exclusivement chronométrés, le bouton est masqué puisque les modes Sport/Détail n'altèrent pas l'interface de leur minuteur.

La valeur persiste dans les champs existants `db.prefs.mode` et `db.workout.mode`.

## Supprimer un programme

Le détail d'un programme possède un bouton explicite « Supprimer ce programme ». Avant toute suppression :
- l'application demande une confirmation mentionnant le nom, le calendrier et la conservation de l'historique ;
- le **dernier programme ne peut pas être supprimé**, car une sauvegarde IronLog valide nécessite au moins un programme ;
- un programme avec une **séance en cours** ne peut pas être supprimé ;
- le programme et son calendrier sont retirés ensemble ;
- si le programme actif est supprimé, le premier programme restant devient actif à la semaine 1 ;
- les activités déjà enregistrées, les statistiques, les préférences et les séances indépendantes restent inchangées ;
- la modification est écrite sur le stockage **avant** d'être appliquée en mémoire ; un échec n'efface rien.

La suppression ne peut pas être annulée via un bouton. Pour pouvoir récupérer un programme, exporter son JSON avant suppression. L'historique reste consultable sans lui.

## Tests et limites

- `tests/remove-program.test.ts` : transitions de suppression, refus du dernier programme, historique et séance en cours.
- `tests/e2e/dark-performance.spec.ts` : thème, interrupteur, persistance, modal ⓘ, confirmation/annulation, activation de remplacement, blocage séance en cours et échec de stockage.
- Les tests E2E existants utilisant les anciens gros boutons sont adaptés au nouveau contrôle.

À vérifier sur iPhone Safari :
1. Sauvegarder les données depuis Vous > Plus.
2. Vérifier les quatre onglets, l'éditeur et les modales dans le thème graphite.
3. Démarrer une séance, basculer Sport ON/OFF, modifier une série, ouvrir la fiche ⓘ puis reprendre.
4. Tester un échauffement chronométré bilatéral et le repos sans régression.
5. Créer un programme temporaire, annuler sa suppression, puis le supprimer ; vérifier son absence après rechargement et la conservation de l'historique.
6. Essayer de supprimer le programme actif (après avoir terminé sa séance) et constater l'activation de l'autre programme.
7. Ne **pas** supprimer ni réinstaller l'icône iPhone : les données restent locales à l'origine PWA actuelle.

Les tests Chromium ne remplacent pas une vérification Safari physique. La PR doit être évaluée sur une Deploy Preview avant fusion dans `main`.

## Correctif ergonomique : écran figé et espace utile (retour iPhone)

- Sur l'écran Séance, masquer le bandeau `IRONLOG` redondant, puisque le nom de la séance est déjà dans l'en-tête ; réserver l'espace de sécurité iOS `safe-area-inset-top` à la zone de contenu.
- Dans les autres écrans, réduire le bandeau global à environ 44 px (hors marge de sécurité de l'appareil).
- Remonter immédiatement les informations `SÉRIE / KG / REPS / REPOS` après l'en-tête de l'exercice : retrait de la rangée ON/OFF et suppression du centrage vertical du bloc Sport.
- Empêcher le zoom accidentel de page via la métadonnée viewport `maximum-scale=1, user-scalable=no`, tout en laissant iOS gérer d'éventuels agrandissements liés aux réglages d'accessibilité (le contrôle du navigateur n'est jamais absolu).
- Bloquer les débordements et déplacements **horizontaux de la page** ; maintenir le **défilement vertical** des écrans, les roues de réglage, les modales, et le défilement horizontal explicite des onglets/liste d'exercices.
- Supprimer le geste implicite de balayage gauche/droite qui modifiait l'exercice en cours ; garder les flèches et les boutons de sélection.
- Les barres supérieure/inférieure de Safari sont des éléments du navigateur : l'app web ne peut pas les supprimer depuis un onglet Safari. L'installation « sur l'écran d'accueil » offre un affichage PWA plus immersif, mais il ne faut pas supprimer l'installation de production sans sauvegarde vérifiée.

### Tests ciblés

Vérifier la géométrie du bouton 44 × 44 px à droite de ⓘ, son nom accessible et ses états ON/OFF, la conservation du mode après rechargement, la disparition de l'en-tête global **uniquement pendant une séance**, le gain d'espace avant la première série, l'absence de débordement horizontal, la possibilité de naviguer verticalement dans l'application et l'accès aux valeurs modifiables, même sur petit écran.
