# MSE-25.37 — Flexible Payment Network Rollback

## Objectif

Exécuter de manière contrôlée un rollback réseau à partir d'un plan MSE-25.36 vérifié, sans permettre la suppression d'un bloc étranger au rollout.

## Principes

- vérifier l'intégrité du reçu et du plan avant toute écriture ;
- exiger une sélection explicite des `blockIds` à retirer ;
- exiger `confirm=true` et le fingerprint exact du plan ;
- revalider chaque bloc en base au moment de la suppression ;
- refuser tout bloc qui n'est pas un `flexible_payment` créé par MSE-25.32 ;
- ne jamais modifier la policy de paiement ;
- retourner un résultat détaillé et idempotent.

## Contrat de sécurité

Le rollback réseau ne prend pas « tout le plan » implicitement. L'appelant doit fournir explicitement les `blockIds`. Tout fingerprint périmé ou bloc hors plan est rejeté avant transaction.

Dans la transaction, chaque bloc est relu avec son `pageId`. Un bloc absent est signalé comme déjà retiré et ne provoque pas de suppression étrangère. Un bloc dont `seo.purpose` ou `seo.source` ne correspond pas à MSE-25.32 est refusé.

## Hors périmètre

- aucune restauration automatique des snapshots de page ;
- aucune modification des `AgencyPaymentPolicy` ;
- aucune activation/désactivation agence ;
- aucun rollback sans confirmation explicite.
