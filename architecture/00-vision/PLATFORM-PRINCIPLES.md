# Platform Principles

## P1 — Source de vérité explicite

Chaque donnée critique possède un propriétaire :

- agence et commerce : ERP / Agency ;
- identité visuelle : Brand Engine ;
- données publiques locales : Google Business Engine ;
- destinations et données voyage : Travel Core ;
- contenu éditorial : Content Engine ;
- médias : Media Engine ;
- publication : Publishing Engine.

## P2 — Modules découplés

Un module n’accède pas directement aux tables d’un autre module.

## P3 — Contrats stables

Les échanges se font par API, service ou événement versionné.

## P4 — Multi-tenant par défaut

Toute lecture et écriture doit être filtrée par tenant.

## P5 — Industrialisation

Toute évolution est livrée sous forme de patch installable, testable et réversible.

## P6 — Observabilité

Chaque moteur doit exposer : health check, logs, métriques, erreurs structurées et historique d’exécution.

## P7 — Réutilisabilité

Une capacité n’est considérée complète que si elle peut alimenter au moins deux usages.
