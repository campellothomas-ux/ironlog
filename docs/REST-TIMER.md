# Repos : fonctionnement et limites

## Chronomètre

`src/workout/rest-timer.ts` est un modèle pur à échéance absolue. Un repos possède un identifiant de cycle, le `startedAt` de la séance, un statut (`active`, `paused`, `completed`, `cancelled`), une échéance ou une durée restante, et l'état réduit/agrandi. À chaque affichage, le temps restant est recalculé depuis `Date.now()` et borné à zéro. La pause fige les millisecondes restantes ; la reprise recalcule l'échéance. Les boutons −30, −15, +15 et +30 secondes agissent sur le même état.

L'état est stocké dans `workout.restTimer` sous la clé V4 existante, avec les mêmes garanties de persistance que la séance. Il est inclus dans les sauvegardes complètes ; sa structure et son rattachement à la séance sont vérifiés à l'import. Une ancienne sauvegarde sans champ reste compatible. Après restauration, un repos actif est recalculé à son échéance d'origine : s'il est expiré, il devient terminé lors du retour à l'application ; aucun compte à rebours n'est recréé. Un chrono associé à un autre `startedAt` est ignoré. L'annulation le retire, et la fin de séance le retire avant de créer l'activité, uniquement après confirmation et écriture réussie.

À l'expiration, la transition terminée est enregistrée avant l'alerte. Une réouverture ne répète pas la transition sonore ; le bandeau « REPOS TERMINÉ » reste visible jusqu'à sa fermeture. Si le stockage échoue, l'état précédent reste enregistré et l'erreur est affichée ; le traitement ne boucle pas indéfiniment sur les écritures. La reprise d'activité (`visibilitychange`, `pageshow`) relance le calcul. Une modification manuelle de l'horloge système modifie le temps calculé : aucune horloge monotone ne survit de manière fiable à une fermeture complète sans source externe.

Le son est désactivé par défaut et activable volontairement dans l'écran de repos. Il fonctionne seulement si une session audio a été débloquée par un geste utilisateur, si le navigateur l'autorise et si l'application est visible. Après une fermeture, le navigateur peut exiger une nouvelle interaction pour débloquer l'audio. Aucune vibration ni alerte sonore en arrière-plan n'est promise. Un onglet suspendu ou un téléphone verrouillé ne garantit pas l'exécution JavaScript : l'alerte est affichée au retour, pas nécessairement à l'instant d'expiration.

## Installation et PWA

Le dépôt précédent n'avait ni manifeste ni service worker. Cette branche ajoute `manifest.webmanifest`, une identité `/`, `display: standalone`, deux icônes PNG et une icône Apple. En production HTTPS, `src/main.ts` enregistre `sw.js`. Le service worker ne possède ni gestionnaire `fetch`, ni cache applicatif, ni programmation d'alarme : il ne fournit pas de mode hors ligne et ne prétend pas émettre de notification. Le navigateur doit pouvoir charger le code depuis le réseau ; aucun cache d'application n'est ajouté qui figerait un ancien déploiement.

L'installation, les API disponibles et la séparation éventuelle des stockages dépendent d'iOS et de l'origine. Avant de changer ou de recréer l'icône d'écran d'accueil, exporter une sauvegarde complète et vérifier qu'elle est récupérable. Ne pas supprimer l'ancienne icône avant vérification des données dans la nouvelle. Une Deploy Preview et le site principal ont des origines et stockages distincts.

## Notifications verrouillées : non implémentées

Aucun bouton d'activation ni fausse alerte programmée n'est exposé. Aucun service distant, secret VAPID, abonnement Push, endpoint ou dépense n'a été créé. Le manifeste et le service worker ne prouvent pas qu'une notification puisse être livrée. La réception sur iPhone verrouillé n'a pas été testée et n'est pas annoncée comme fonctionnelle.

Une Web Push réelle exige au minimum une application compatible installée, un consentement obtenu par geste volontaire, un abonnement Push, des clés VAPID côté serveur et un déclencheur distant durable. Il doit traiter les changements de durée, pauses, reprises, annulations et fin de séance, avec une génération/identité de cycle vérifiée juste avant émission. Il faut protéger les abonnements, éviter les endpoints d'envoi public et limiter les abus ; une réponse positive du serveur ne prouve pas la réception de la notification sur l'iPhone.

Options examinées : une tâche cron à la minute est trop grossière pour un repos de 60–90 s ; une fonction Netlify classique n'est pas un ordonnanceur durable ; une fonction d'arrière-plan seule ne fournit pas une file temporisée révocable. Un service externe gratuit avec file à délai ou processus durable pourrait fonctionner seulement après vérification de ses quotas, délais, politique de suspension, mécanismes de révocation et authentification. Les offres et quotas changent ; les conditions actuelles et un service suffisamment précis n'ont pas été vérifiés ici. Aucun compte ni service n'a été provisionné. Un backend gratuit et sûr, puis des tests réels sur iPhone verrouillé, restent nécessaires avant de proposer cette fonction.

## Vérifications et protocole iPhone

`npm ci`, lint et build ; 29 tests unitaires/intégration dans chacun des fuseaux Europe/Paris et America/New_York ; 70 parcours Chromium sur les cinq tailles de la PR 002. Tests : échéance, pause/reprise, changement de durée, fin, annulation, rechargement, suspension simulée, horloge modifiée, stockage refusé, séance terminée sans chrono fantôme et sauvegarde. Contrôle sur build de production Chromium : manifeste `standalone`, service worker actif, aucun cache applicatif ; permission des notifications refusée dans ce navigateur de test, sans demande émise par l'application. WebKit non exécuté : téléchargement précédemment refusé par le proxy. Ce résultat n'est pas une validation iOS.

Avant fusion, sur une preview et après sauvegarde externe :

1. Démarrer 30 s avec l'application visible ; vérifier la fin, la bannière et le son activé puis désactivé.
2. Démarrer 90 s puis verrouiller l'iPhone ; noter l'heure de fin, déverrouiller et vérifier le temps recalculé. Aucune notification verrouillée n'est attendue.
3. Démarrer 180 s, changer d'application puis revenir ; comparer à l'heure réelle.
4. Mettre en pause, verrouiller, revenir et vérifier que la durée est figée.
5. Ajouter 30 s puis retirer 15/30 s ; comparer l'échéance à l'heure réelle.
6. Annuler avant expiration ; attendre puis vérifier l'absence de bandeau ou chrono fantôme.
7. Fermer puis rouvrir en mode réduit et en plein écran ; vérifier état et durée.
8. Terminer une séance pendant un repos ; démarrer une nouvelle séance et vérifier l'absence de l'ancien chrono.
9. Avec les notifications refusées, vérifier le fonctionnement du chrono sans demande de permission.
10. Tester une vraie Web Push sur iPhone installé et verrouillé uniquement lorsqu'un service distant sûr existe ; ce test est actuellement impossible.

Noter les écarts de temps observés, l'état d'installation (Safari ou écran d'accueil), la version d'iOS et l'origine utilisée. Ne pas conclure qu'une notification a été reçue sans l'avoir observée réellement.
