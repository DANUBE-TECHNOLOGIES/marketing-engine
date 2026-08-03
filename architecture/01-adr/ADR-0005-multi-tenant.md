# ADR-0005 — Multi-tenant natif

- Statut : Acceptée
- Date : 2026-08-02

## Contexte

La plateforme Mondescale comporte plusieurs moteurs appelés à évoluer indépendamment.

## Décision

Le tenantId est obligatoire dans les domaines partagés. Les repositories appliquent systématiquement le scope tenant.

## Conséquences

Le futur SaaS peut isoler les données de chaque client.

## Critères de conformité

- La décision doit être respectée dans les nouveaux développements.
- Toute exception doit être documentée dans une nouvelle ADR.
