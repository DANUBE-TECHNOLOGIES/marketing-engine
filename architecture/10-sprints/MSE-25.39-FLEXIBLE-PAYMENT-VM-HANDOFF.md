# MSE-25.39 — Flexible Payment VM Handoff

## Objectif

Clore la chaîne Flexible Payment côté dépôt afin que la seule étape restante soit l'injection et la validation runtime sur la VM Marketing Engine.

## Livrables

- endpoint réseau read-only d'état opérationnel ;
- contrôle VM `mse-25.39:vm-readiness` ;
- validation explicite de la connexion PostgreSQL ;
- validation de la présence de la table `AgencyPaymentPolicy` ;
- validation du contrat d'exports des couches MSE-25.34 à MSE-25.38 ;
- tests CI dédiés ;
- runbook d'injection, migration et validation runtime.

## Garde-fous

Le contrôle de readiness n'effectue aucune écriture. L'endpoint opérationnel n'expose aucune action de rollout ou de rollback. Une migration absente, une base inaccessible ou un module incomplet rend le handoff non prêt.

## Critère de clôture

La tranche est terminée lorsque la CI du HEAD final est verte. À partir de ce point, aucun développement supplémentaire n'est requis avant l'injection VM ; seuls restent le checkout du code, `prisma migrate deploy`, le redémarrage du runtime et les contrôles décrits dans le runbook.
