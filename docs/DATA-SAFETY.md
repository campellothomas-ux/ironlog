# Sauvegarde et sécurité des données

IronLog stocke ses données dans `ironlog-v4-prototype-2026-11-06`, sur l'origine et dans le navigateur où elles ont été créées. Il n'y a ni compte ni synchronisation : deux appareils conservent deux historiques indépendants. Un export/import manuel est un remplacement explicite, pas une synchronisation ni une fusion.

## Format

L'export complet est un JSON UTF-8 nommé `ironlog-backup-AAAA-MM-JJ-HHMM.json` (heure locale), avec `{ "app": "IronLog", "formatVersion": 1, "createdAt": "…Z", "data": { … } }`. `data` contient l'état complet, y compris programmes, historique, préférences, séance en cours, calendrier et propriétés supplémentaires compatibles. La date de création est en UTC ; elle ne modifie pas les dates du programme ou des activités.

La restauration accepte aussi `{ "app": "IronLog V4", "version": 4, "data": … }` et un état V4 brut. Aucun export de programme isolé n'est traité comme une sauvegarde complète. Les versions futures inconnues sont refusées. Les propriétés supplémentaires sont conservées ; les clés dangereuses et structures excessivement imbriquées sont refusées.

La validation vérifie les types et valeurs nécessaires à l'application : programmes, semaines, séances, exercices, séries, valeurs numériques, identifiant du programme actif, profil, historique, séance courante et dates du calendrier. Les séries et exercices ne sont ni normalisés ni recréés. Les fichiers de plus de 20 Mo sont refusés avant lecture. Le navigateur peut imposer une limite de stockage inférieure.

## Restaurer

Dans Vous > Plus, exporter d'abord l'état actuel, puis sélectionner un fichier et vérifier les résumés de l'état actuel et de celui à restaurer. L'aperçu n'écrit rien. La confirmation remplace l'intégralité de l'état, sans fusion. Le nouvel état est validé puis écrit en une seule opération localStorage ; l'état mémoire ne change qu'après succès. En cas d'échec, le précédent état reste disponible et un message propose de réessayer. L'écriture de fin de séance conserve son mécanisme existant.

L'application peut demander un téléchargement ; elle ne peut pas vérifier que l'utilisateur a enregistré le fichier. Confirmer dans l'application Fichiers qu'une copie externe lisible existe avant tout remplacement. Un fichier n'est jamais envoyé à un serveur par IronLog.

## Base illisible ou stockage inaccessible

Au premier lancement sans clé, le programme de démonstration est initialisé. Si une valeur existe mais n'est pas lisible ou ne passe pas la validation, elle n'est ni supprimée ni écrasée : l'écran de récupération propose d'exporter le contenu brut, de restaurer une sauvegarde valide, ou de réinitialiser après avertissement. Si la lecture du stockage échoue, le message le distingue ; il peut être nécessaire de modifier les réglages du navigateur ou de libérer de l'espace. Un export brut n'est pas une sauvegarde restaurable automatiquement ; il peut aider à un diagnostic.

Les écritures legacy passent par une fonction centrale qui annule en mémoire une modification dont la persistance échoue et signale l'erreur. L'état affiché revient à la dernière écriture réussie ; une modification en cours peut devoir être ressaisie. Les opérations de calendrier et de restauration préparent un état séparé et écrivent avant remplacement. Pas de garantie de transaction entre plusieurs onglets ou appareils ; éviter d'utiliser simultanément plusieurs onglets sur la même origine.

## Migration entre domaines ou appareils

1. Sur l'ancienne origine et le bon appareil, exporter une sauvegarde complète.
2. Dans Fichiers, vérifier l'existence du fichier et conserver une copie externe non modifiée. Il contient des données personnelles.
3. Sur la nouvelle origine ou le nouvel appareil, exporter aussi les éventuelles données déjà présentes.
4. Sélectionner le fichier d'origine, comparer l'aperçu aux données actuelles, confirmer puis recharger. Vérifier programmes, performances, calendrier et séance en cours.
5. Conserver les deux fichiers externes jusqu'à validation. Une Deploy Preview ayant une origine distincte ne partage pas automatiquement les données du site principal.

## iPhone : validation manuelle avant fusion

Sur chacun des deux iPhone, tester Safari puis l'application ajoutée à l'écran d'accueil : export JSON, enregistrement et ouverture dans Fichiers, sélection depuis « Sur mon iPhone » et iCloud Drive, annulation, restauration d'une copie, fermeture/réouverture et rechargement, y compris une sauvegarde proche des limites de stockage. Vérifier le traitement d'un quota plein et la lisibilité des messages. Les tests Chromium ne prouvent pas le comportement d'iCloud Drive, de la feuille de partage ou de la PWA iOS ; aucune promesse de synchronisation ni de téléchargement vérifié n'est faite ici.
