# ADR-0010 — AI Gateway

- Statut : Acceptée
- Date : 2026-08-02

## Contexte

La plateforme Mondescale comporte plusieurs moteurs appelés à évoluer indépendamment.

## Décision

Tout appel à un modèle IA passe par une abstraction commune capable de router vers plusieurs fournisseurs.

## Conséquences

Le fournisseur peut évoluer sans modifier les modules métier.

## Critères de conformité

- La décision doit être respectée dans les nouveaux développements.
- Toute exception doit être documentée dans une nouvelle ADR.
