# Audit V4 — 6 novembre 2026

Source examinée : `ironlog-v4-prototype.html`, commit `94c6ebc988f68fada012da5a13bc06891b05b241`. Un HTML autonome, CSS et JavaScript intégrés, sans dépendance, tests ni chaîne de build. Le fichier est conservé comme référence.

## Fonctionnalités réellement présentes dans le code

- Accueil : programme actif, choix et reprise de séance, statistiques hebdomadaires.
- Programmes : création, import/export JSON, éditeur exercices/séries, ordre, jours, modification semaine courante ou suivantes, progression initiale sur huit semaines.
- Planning hebdomadaire : déplacement des jours sans modifier les exercices.
- Séance : Sport et Détail, roues poids/reps/repos, saisie directe, séries, navigation et gestes, remplacement, conseils, chrono avec pause, ajustement et réduction.
- Vous : Activités recherchables, détails, Progrès (tonnage, durée, fréquence et charge par exercice), carte musculaire pondérée, Records, profil, sauvegarde/restauration.
- Partage : canvas PNG, formats story/post, styles et photo, partage natif avec téléchargement de repli.

Cet inventaire est une lecture de code ; les tests de cette PR ne certifient pas tous ces parcours.

## Données

Stockage JSON unique : `ironlog-v4-prototype-2026-11-06`. Programmes et semaines, préférences, historique et séance active y cohabitent. Le chronomètre en mémoire ne reprend pas après rechargement. Les identifiants de modèles sont réutilisés entre semaines : ils ne suffisent pas à identifier une activité. Les données restent locales à l'origine du navigateur. Exporter depuis l'ancien domaine et importer sur le domaine de test est nécessaire en cas de changement d'origine.

## Défauts et limites identifiés

1. `save()` avale les erreurs de stockage ; `finishWorkout()` détruit l'état actif en mémoire puis annonce un succès même si rien n'est écrit. Corrigé pour la fin de séance dans cette PR.
2. Les lignes Détail terminées gardent le même aspect ; seule la couleur du bouton change et une coche existe aussi avant validation. À corriger séparément.
3. Le remplacement liste toute la bibliothèque ; il conserve l'ancienne charge sans historique et écrase les reps avec l'historique s'il existe. Pas de métadonnées mouvement/matériel. À corriger séparément.
4. Planning stocké dans `session.day` du programme : séparation avec le contenu seulement dans l'interface, sans modèle de calendrier indépendant. Pas de vue mois. Une migration de données sera nécessaire.
5. Les autres sauvegardes continuent d'avaler les erreurs, et un JSON illisible au démarrage déclenche une base de démonstration. Pas de validation complète des sauvegardes importées. Travail de stockage à poursuivre.
6. Pas de synchronisation multi-onglets : cette PR garantit l'unicité dans le parcours d'un onglet, pas une transaction entre onglets concurrents.
7. `open-plan` écrit `ui.progPlanId` tandis que le rendu lit `db.progPlanId` : risque d'afficher le programme actif au lieu du programme choisi.

## Architecture progressive

Vite + TypeScript, DOM natif : aucune dépendance de framework nécessaire pour ce prototype.

- `src/main.ts` : point d'entrée.
- `src/legacy.ts` : comportements V4 conservés, temporairement exclus du typage et du lint. Dette explicite, pas une migration TypeScript complète.
- `src/styles.css` : styles V4 inchangés.
- `src/storage.ts` : contrat de persistance et clé compatible.
- `src/workout/complete.ts` : transition de fin de séance typée, écriture atomique et identité stable par modèle + démarrage.
- À extraire ensuite : `programs/`, `planning/`, `workout/` (modes, roues, repos), `activities/`, `progress/`, `sharing/`, puis validation/versionnement des données.

## Portée de la première PR

Base technique et fin de séance uniquement. Confirmation conservée ; succès vers la liste Activités immédiatement ; échec explicite avec possibilité de réessayer ; double action sans doublon. Aucun déploiement en production. La compatibilité Safari physique et tous les parcours secondaires restent à vérifier manuellement.
