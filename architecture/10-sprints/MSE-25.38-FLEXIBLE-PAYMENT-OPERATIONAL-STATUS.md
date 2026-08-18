# MSE-25.38 — Flexible Payment Operational Status

## Objectif

Consolider en lecture seule l'état opérationnel du service de paiement flexible après configuration, déploiement ou rollback, sans créer de nouvelle capacité d'écriture.

## Principes

- réutiliser le readiness MSE-25.34 comme source d'état courant ;
- distinguer clairement les sites non configurés, désactivés, prêts, déployés et bloqués ;
- signaler les incohérences entre une policy activée et les blocs publics réellement présents ;
- exposer un résumé réseau stable pour un futur cockpit opérateur ;
- ne jamais modifier une policy, une page ou un bloc ;
- ne collecter aucune donnée personnelle.

## Contrat attendu

Le rapport opérationnel expose l'état par site, le nombre de blocs `flexible_payment` réellement présents, les anomalies détectables, un résumé réseau (`healthy`, `attention`, `blocked`) et un fingerprint déterministe du snapshot.

## Hors périmètre

Aucune remédiation automatique, aucun rollout, aucun rollback, aucune modification de policy et aucun branchement analytics supplémentaire.
