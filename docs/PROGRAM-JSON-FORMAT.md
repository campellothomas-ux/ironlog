# Format d'import de programmes IronLog

## Enveloppe et données

Le format officiel est `{ "kind": "ironlog-programs", "formatVersion": 1, "programs": [...] }`. Chaque programme contient `name`, `description`, `weeks` (1 à 52 entrées) et facultativement `startDate` au format local `AAAA-MM-JJ`. Chaque semaine contient `sessions`, qui peut varier d'une semaine à l'autre. Une semaine détaillée n'est jamais recopiée ; seules les formes historiques à liste unique sont dupliquées selon `durationWeeks`, `weekCount` ou `weeksCount` (8 par défaut).

Chaque séance contient `name`, `day` (Lundi à Dimanche), `logicalKey`, `warmupExercises`, `exercises` et `cooldownExercises`. Une séance peut ne contenir que de la préparation ou du retour au calme. La `logicalKey` identifie une séance récurrente entre semaines, même si son jour ou son nom change ; elle doit être unique dans une semaine. En son absence, elle est déduite du nom et du jour. Une occurrence reçoit un identifiant interne distinct ; une modification explicite « semaines suivantes » utilise la clé logique et demande confirmation avant d'écraser une progression.

Les mouvements de préparation contiennent `name`, `type` (`mobility`, `activation`, `cardio` ou `specific`), `sets` (passages), `durationSeconds` et/ou `reps`, puis facultativement `rest`, `note`, `equipment` et `kg`. Une durée est en secondes. Le champ historique `duration` est refusé sauf si `durationUnit` indique explicitement `seconds` ou `minutes` ; si les deux durées sont présentes, elles doivent correspondre. Les mouvements minutés ont leur propre minuteur, distinct du repos entre séries.

Les exercices principaux contiennent `name`, facultativement `primary`, `secondary`, `tip`, et `sets`, tableau d'objets `{ "kg": 42.5, "reps": 8, "rest": 90 }`. Les temps de repos sont en secondes, les charges en kilogrammes. Les métadonnées musculaires manquantes sont complétées depuis la bibliothèque existante lorsque le nom y figure. Les champs supplémentaires compatibles sont conservés à travers import et export ; les clés dangereuses et les données réservées aux sauvegardes (`history`, `workout`, `prefs`, `calendar`) sont refusées. Les identifiants internes et les états de validation ne sont pas exportés comme prescriptions.

Exemples fictifs : [huit semaines](../examples/programs/fixed-8-weeks.json), [semaines variables et mobilité](../examples/programs/variable-weeks.json), [séance complète](../examples/programs/preparation-session.json), [deux programmes](../examples/programs/two-programs.json). Les valeurs illustrent la structure ; elles ne constituent pas une prescription.

## Import et export

Programme > Importer : le fichier est lu, analysé et validé avant l'aperçu des programmes, semaines et séances. Annuler ne modifie pas les données. Confirmer ajoute les programmes sans les activer ni remplacer l'historique, la séance en cours ou les préférences ; un programme identique demande une confirmation supplémentaire. En cas d'échec de stockage, l'état enregistré précédent est conservé et l'import peut être retenté. Une `startDate` explicite crée l'ancrage du calendrier au lundi correspondant ; aucun début n'est inventé. L'export d'un programme reprend l'ancrage configuré dans son calendrier et n'inclut pas l'historique personnel.

Les blocs préparatoires sont stockés séparément des séries principales. Leurs passages réalisés ou sautés apparaissent dans le détail de l'activité, mais ne comptent pas dans le tonnage, les records ou la progression des charges. La durée de la séance comprend la préparation. L'activité peut être terminée sans effectuer le retour au calme. La dernière performance reste visible comme référence, sans remplacer la prescription courante.

## Compatibilité et limites

Les alias historiques du code V4 sont acceptés : `program`, `programs`, `days`, `weeks`, `sessions`, `workouts`, `durationWeeks`, `weekCount`, `weeksCount`, `mainExercises`, `exercise`, `label`, `weight`, `load`, `repetitions`, `restSeconds` et `series`. Les nombres décimaux fournis comme chaînes numériques simples sont acceptés ; les valeurs négatives, non numériques ou avec unités implicites sont refusées. Les noms manquants des formes historiques reçoivent les valeurs par défaut de V4. Le nouveau format exige des noms explicites.

Aucun fichier V3 réel représentatif n'a été fourni. Les champs `warmupExercises`, `sets`, `reps`, `rest`, `duration` avec unité explicite et `note` sont adaptés lorsqu'ils respectent les structures décrites ; cela ne constitue pas une garantie de compatibilité complète V3. Toute durée ambiguë ou structure inconnue nécessitera une conversion explicite. Les sauvegardes complètes restent un parcours séparé dans Vous > Plus.

## Exercices guidés et bilatéraux

Le format reste en version 1. Les trois phases acceptent `objective`, `startingPosition`, `instructions` (liste de textes), `cues` (liste), `commonMistakes` (liste), `breathing`, `equipment`, `note`, `tip`, `imageUrl` et `videoUrl`. Les médias sont facultatifs, HTTPS sans identifiants ; ils ne doivent être fournis qu'avec une autorisation d'utilisation. Aucune URL n'est générée automatiquement.

`durationSeconds` est la durée de travail **par côté** si `perSide: true`. `sideOrder` contient exactement `left` et `right` (défaut : gauche puis droite). `transitionSeconds` vaut 5 par défaut, accepte zéro. Un passage bilatéral est une seule série. Le repos suit les deux côtés, uniquement entre les séries.

Les phases préparatoires conservent `sets` entier et une prescription commune. Les exercices principaux conservent `sets` entier (prescription commune) ou une liste d'objets : `{kg, reps, rest, durationSeconds, perSide, sideOrder, transitionSeconds}`. Les valeurs sur la série priment sur celles de l'exercice. Dans un exercice chronométré principal, toutes les séries ont une durée strictement positive ; les durées et repos peuvent varier selon la série. Le mélange répétitions/temps au sein du même exercice est refusé : utiliser deux exercices. Les anciennes séries `kg/reps/rest` restent compatibles.

L'état `execution` est réservé à la séance active et aux sauvegardes, exclu des exports de programme. Il conserve l'ordre des étapes, l'index, l'échéance absolue, la pause et les étapes écoulées ou passées. Un temps écoulé n'est pas une preuve de réalisation : les séries principales sont confirmées explicitement. Les phases préparatoires ne contribuent pas aux records ni au tonnage ; les séries chronométrées principales sont également exclues des records de charge et du tonnage.

Exemple complet : [bilateral-guided.json](../examples/programs/bilateral-guided.json). Le scénario dure 315 secondes : trois fois 30 + 5 + 30 secondes, deux repos de 60 secondes, sans repos final.
