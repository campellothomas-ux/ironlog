# Prompt de génération de programmes JSON

Produis uniquement un objet JSON valide conforme à `ironlog-programs`, `formatVersion: 1`, avec `programs` contenant les programmes demandés. Ne crée aucune prescription si des informations nécessaires manquent ; demande-les avant de générer.

Chaque programme contient `name`, `description` et `weeks` (1 à 52 semaines). Chaque semaine contient son propre tableau `sessions` ; ne répète pas les prescriptions par défaut si chaque semaine est décrite. Pour chaque séance, fournis `logicalKey` stable d'une semaine à l'autre, `name`, `day` en français, `warmupExercises`, `exercises` et `cooldownExercises`. La clé logique est unique dans chaque semaine.

Préparation et retour au calme : `name`, `type` parmi `mobility`, `activation`, `cardio`, `specific`, `sets`, et `durationSeconds` et/ou `reps`. `rest` est facultatif et en secondes ; `note`, `equipment` et `kg` sont facultatifs. N'utilise jamais `duration` sans unité explicite. La séance peut être uniquement de mobilité, avec `exercises: []`.

Exercices principaux : `name` et `sets` sous forme de tableau d'objets contenant `kg`, `reps`, `rest` en secondes ; aucune valeur négative. Ajoute `primary` et `secondary` si les muscles sont connus. Écris toutes les semaines explicitement et respecte les variations communiquées. N'ajoute jamais l'historique, les préférences, une séance en cours ou des données personnelles à l'export de programme.
