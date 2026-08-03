# ADR-0003 — Service Layer obligatoire

- Statut : Acceptée
- Date : 2026-08-02

## Contexte

La plateforme Mondescale comporte plusieurs moteurs appelés à évoluer indépendamment.

## Décision

Toute logique métier passe par un service. Les routes et composants n’accèdent pas directement aux repositories.

## Conséquences

La logique devient testable, réutilisable et indépendante du transport HTTP.

## Critères de conformité

- La décision doit être respectée dans les nouveaux développements.
- Toute exception doit être documentée dans une nouvelle ADR.
