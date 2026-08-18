# MSE-25.36 — Flexible Payment Rollout Audit

## Objectif

Ajouter une preuve déterministe et exploitable après chaque rollout réseau MSE-25.35, sans modifier les règles de paiement ni relancer automatiquement des écritures.

## Principes

- produire un reçu d'audit à partir du résultat réel d'un rollout ;
- lier le reçu au fingerprint réseau utilisé lors de l'apply ;
- tracer uniquement les identifiants techniques nécessaires au contrôle ;
- ne conserver aucune donnée personnelle ;
- permettre de construire un plan de rollback explicite, sans l'exécuter automatiquement ;
- refuser tout reçu incomplet ou incohérent.

## Contrat

Un reçu contient : version, source, rolloutFingerprint, receiptFingerprint, date fournie par l'appelant, sites sélectionnés, sites appliqués et blocs créés identifiés par pageId/blockId.

Le plan de rollback est read-only. Il ne contient que les blocs explicitement marqués comme créés par MSE-25.32/25.35 et nécessite une confirmation séparée dans une éventuelle couche d'exécution.

## Hors périmètre

- aucun rollback automatique ;
- aucune modification de policy ;
- aucune collecte d'email, téléphone, nom client ou donnée de navigation ;
- aucune interprétation financière nouvelle.
