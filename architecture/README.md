# Mondescale Marketing Engine — Architecture

## Périmètre

Ce dossier constitue la source de vérité architecturale pour :

- le Local Engine existant ;
- le futur Local SEO Engine ;
- le Marketing Engine ;
- les mini-sites SEO ;
- le Travel Knowledge Graph ;
- le Content Engine ;
- le Publication Engine ;
- les analytics marketing ;
- les automatisations marketing ;
- la fusion progressive Local Engine → Marketing Engine.

L’ERP est considéré ici uniquement comme un système externe.

## Trajectoire

1. Préserver le Local Engine en production.
2. Cartographier ses capacités réelles.
3. Construire les nouvelles capacités Marketing Engine dans le même dépôt.
4. Exposer les capacités existantes comme services métier.
5. Migrer progressivement les responsabilités.
6. Renommer à terme l’application unifiée Marketing Engine.

## Règle de développement

Aucune capacité existante ne doit être recréée sans audit préalable.

Chaque développement doit respecter l’ordre :

1. besoin métier ;
2. capability ;
3. domain model ;
4. contrat API ;
5. modèle de données ;
6. UX ;
7. implémentation ;
8. tests ;
9. migration ;
10. documentation.
