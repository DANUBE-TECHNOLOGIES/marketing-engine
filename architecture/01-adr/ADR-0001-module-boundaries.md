# ADR-0001 — Frontières de modules

- Statut : Acceptée
- Date : 2026-08-02

## Contexte

La plateforme Mondescale comporte plusieurs moteurs appelés à évoluer indépendamment.

## Décision

Chaque module possède son périmètre, ses services et ses repositories. Aucun module ne lit directement les tables d’un autre module.

## Conséquences

Les dépendances deviennent explicites. Les migrations et refactorings sont plus sûrs.

## Critères de conformité

- La décision doit être respectée dans les nouveaux développements.
- Toute exception doit être documentée dans une nouvelle ADR.
