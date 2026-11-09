# PR #8 — Notes, exercices personnalisés et historique modifiable

## Objectif

Trois demandes issues d'une séance IronLog réelle :

1. Chaque exercice possède un espace **NOTE** pour les sensations, réglages de machine ou observations. Il reste discret dans l'écran Séance et s'ouvre au besoin. Il est disponible pour la musculation, l'échauffement et le retour au calme. Les notes sont propres à **l'occurrence de séance** : elles suivent l'exercice dans l'activité enregistrée, **sans modifier le programme planifié**.
2. Dans « Remplacer l'exercice », la première action est **＋ CRÉER UN EXERCICE**. Seul le nom est obligatoire (100 caractères maximum). L'exercice remplace immédiatement le mouvement sélectionné et conserve son nombre de séries et les prescriptions actuelles, devenues librement ajustables. Le nom est conservé dans `customExercises` pour les futurs remplacements, y compris après rechargement.
3. « Vous → Activités » permet de **modifier ou supprimer une séance historique**.

## Modifier une activité

Le formulaire permet de changer le nom, la date/heure de fin, la durée, le nom des exercices, leurs notes, les charges, répétitions, temps de repos et indicateurs de série réalisée. On peut ajouter/retirer des séries et des exercices. Le journal brut des chronos déjà exécutés n'est pas réécrit.

Les statistiques, records, tableaux et courbes sont dérivés de `db.history`. Après validation de l'édition, ils reflètent automatiquement les nouvelles valeurs et les validations de séries.

Le programme source, le calendrier des séances prévues et les séances actives **ne sont pas modifiés**.

## Supprimer une activité

La suppression exige une confirmation explicite comprenant le nom, la date, et le fait que la séance cesse de compter dans les statistiques. Il n'y a aucune suppression automatique des programmes ni des réglages.

**Aucune mutation de l'état mémoire avant l'écriture du stockage** : en cas de refus ou de dépassement de quota, l'historique reste intact.

La suppression n'a pas de bouton d'annulation après confirmation ; exporter une sauvegarde JSON avant la première utilisation est recommandé.

## Stockage et sauvegardes

- Les notes sont enregistrées dans le champ d'exercice `trainingNote`, limité à 2 000 caractères. Ce champ est distinct de `tip` et `note` qui décrivent les instructions de réalisation.
- Les exercices personnalisés sont conservés dans `db.customExercises` (tableau d'objets `{name,primary,secondary,tip}`).
- Le validateur de sauvegarde accepte ces champs **facultatifs** et continue de restaurer les anciens exports.
- Tous les champs affichés et textes libres sont échappés pour éviter l'injection HTML.

## Vérifications à réaliser

- Lint, TypeScript, build, tests Paris et New York, E2E WebKit sur les cinq résolutions existantes.
- En séance : noter un exercice, changer d'exercice, revenir, retrouver la note, terminer et vérifier dans l'historique après rechargement.
- Créer un exercice personnalisé depuis « Remplacer », modifier ses charges/répétitions et vérifier qu'il réapparaît dans le menu lors d'une séance ultérieure.
- Terminer une séance, corriger une série historique, vérifier les nouveaux tonnage/record/graphique, sans changement du programme.
- Supprimer une activité test, vérifier les statistiques et la réouverture de l'app.
- Refuser une confirmation de suppression et simuler un échec de stockage : aucune activité ne doit disparaître.
- Exporter puis restaurer une sauvegarde contenant des notes et des exercices personnalisés.

**PR en brouillon jusqu'à validation Safari iPhone réelle. Ne pas fusionner automatiquement ; ne pas reprendre la PR #5 Web Push.**

## PR #8.1 — Basculer REPS / CHRONO dans la séance (retour utilisateur)

Quand on touche la valeur **RÉPÉTITIONS** du mode Sport ou d'une ligne du mode Détail, la feuille de réglage propose désormais **RÉPÉTITIONS | CHRONO**. La bascule est volontaire et n'est persistée qu'après validation.

- **Répétitions** : la roue habituelle reste inchangée, et n'ajuste que la série ciblée si le mode n'est pas modifié.
- **Chrono** : saisie d'une durée de travail en secondes (1 à 3 600), valeur par défaut de **30 s**. La conversion s'applique aux séries de **l'exercice courant**, conserve les temps de repos individuels et permet de lancer l'exécution automatique existante.
- **Par côté** : case facultative. Chaque série fait travail gauche → **transition 5 s** → travail droite → repos, sans repos après la dernière série. Une seule série est confirmée pour les deux côtés.
- L'écran de minuterie possède **« ⏱ Durée / Mode »** pour modifier la durée et revenir éventuellement aux répétitions, ainsi qu'un accès au repos.
- Un chrono **actif ou en pause** ne peut pas être reconfiguré avant d'avoir été arrêté. Une modification après exécution demande confirmation et réinitialise l'état chronométré et les validations de cet exercice.
- Un changement CHRONO → RÉPÉTITIONS retire les champs temporisés et ramène l'affichage et les contrôles habituels.
- Les séances programmées, les autres exercices et l'historique ne sont **pas modifiés** par le réglage en direct.
- Les séries chronométrées sont affichées en durée dans l'historique, plutôt que comme « 0 répétition », et n'augmentent pas le tonnage musculaire.
- Un exercice personnalisé est créé avec **0 kg et 10 répétitions** plutôt que de reprendre les charges d'un mouvement remplacé.

**Contrôles ajoutés :** tests unitaires de conversion dans `tests/exercise-prescription.test.ts`, et tests E2E `tests/e2e/reps-chrono.spec.ts` (création de gainage, chrono bilatéral 30/5/30, retour aux répétitions, suspension de modification en cours de chrono, persistance après rechargement et repos préservé).

**Pas de changement du schéma JSON `ironlog-programs` ni de fusion automatique.** Tester la feuille de réglage et les minuteurs réels sur Safari iPhone avant validation.
