# ADR-0006 — Google Business comme source publique

- Statut : Acceptée
- Date : 2026-08-02

## Contexte

La plateforme Mondescale comporte plusieurs moteurs appelés à évoluer indépendamment.

## Décision

Google Business Profile est la source de référence pour horaires, coordonnées publiques, avis et informations locales synchronisées.

## Conséquences

Les mini-sites utilisent un cache local synchronisé et n’interrogent jamais Google à chaque visite.

## Critères de conformité

- La décision doit être respectée dans les nouveaux développements.
- Toute exception doit être documentée dans une nouvelle ADR.
