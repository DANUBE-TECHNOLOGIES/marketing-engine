# ADR-0002 — Event Bus inter-modules

- Statut : Acceptée
- Date : 2026-08-02

## Contexte

La plateforme Mondescale comporte plusieurs moteurs appelés à évoluer indépendamment.

## Décision

Les changements métier significatifs publient des événements versionnés consommables par d’autres moteurs.

## Conséquences

Les modules restent découplés et les traitements asynchrones deviennent possibles.

## Critères de conformité

- La décision doit être respectée dans les nouveaux développements.
- Toute exception doit être documentée dans une nouvelle ADR.
