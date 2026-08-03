# ADR-0004 — Patch Manager obligatoire

- Statut : Acceptée
- Date : 2026-08-02

## Contexte

La plateforme Mondescale comporte plusieurs moteurs appelés à évoluer indépendamment.

## Décision

Toute évolution structurante est livrée via un patch versionné avec manifeste, tests et rollback.

## Conséquences

Les déploiements deviennent reproductibles et traçables.

## Critères de conformité

- La décision doit être respectée dans les nouveaux développements.
- Toute exception doit être documentée dans une nouvelle ADR.
