# Calendrier et compatibilité V4

La clé `ironlog-v4-prototype-2026-11-06` et les objets existants restent inchangés. Aucune migration ne s'exécute à l'ouverture : une sauvegarde V4 sans calendrier fonctionne immédiatement et montre ses activités à leur date réelle.

## Champ optionnel, ajouté sur action explicite

```ts
calendar?: {
  [programId: string]: {
    startDate: string; // YYYY-MM-DD local, lundi de la semaine 1
    moves: { [occurrenceKey: string]: string }; // date locale explicite
  };
}
```

L'utilisateur choisit une date et confirme le lundi correspondant. Aucun ancrage n'est déduit de `db.week` : ce champ continue à désigner l'avancement dans le programme. Un changement de date ne modifie ni ce compteur, ni les programmes, ni les historiques, ni une séance active.

Une occurrence se définit par l'indice de semaine (base zéro) et l'identifiant de séance : `1:session_x`. Les identifiants V4 seuls sont réutilisés entre semaines. Le calendrier génère exactement les semaines du programme, sans répétition infinie. Le jour V4 (`session.day`) fournit l'organisation de base ; un déplacement daté prime pour cette occurrence, sans modifier les exercices ou `session.day`.

Un déplacement peut explicitement sortir de la période initiale : cela ne crée aucune occurrence supplémentaire. Changer le début du programme décale les séances non déplacées ; les déplacements explicites gardent leur date. L'interface l'indique avant configuration. Un autre programme actif conserve sa propre configuration.

Les activités se fondent uniquement sur `finishedAt` dans le fuseau local du navigateur. Aucun rapprochement par nom ni validation automatique d'une séance prévue. Un jour peut présenter les deux indicateurs distincts.

## Persistance et sauvegardes

La configuration et les déplacements sont écrits avant remplacement de l'état mémoire ; une erreur de stockage remonte à l'interface. Aucun effacement ni réinitialisation n'est nécessaire. Export/import de la sauvegarde complète V4 conserve ce champ additionnel. L'export d'un programme seul reste un export de contenu, pas de calendrier. Revenir à V4 ignore ce champ ; les modifications anciennes de contenu peuvent rendre certains déplacements orphelins, sans altérer les exercices.

Les limites préexistantes des autres sauvegardes legacy (erreurs absorbées, absence de synchronisation multi-onglets) ne sont pas élargies dans cette PR. Le parcours de fin de séance typé de PR 001 reste intact.

## Dates

`src/planning/dates.ts` traite des dates civiles locales à midi, navigue avec `setDate` / `setMonth` et sérialise via les composantes locales. Aucun `toISOString()` pour convertir une journée ni addition de 86 400 000 ms. Tests Paris/New York : jours de 23 et 25 heures, années bissextiles, fins de mois, années et lundi comme début de semaine.

## Découpage

- `dates.ts` : opérations calendaires pures.
- `model.ts` : projection des programmes et mises à jour immuables du calendrier.
- `view.ts` : rendu typé des deux vues, indicateurs et agenda sélectionné.
- `src/legacy.ts` : adaptateur d'événements vers le stockage existant et les modales V4.

Les écrans historiques restent en migration progressive ; aucun nouveau module n'est exclu du typage ou du lint.
