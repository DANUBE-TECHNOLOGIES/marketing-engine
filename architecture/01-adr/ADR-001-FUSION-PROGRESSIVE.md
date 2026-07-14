# ADR-001 — Fusion progressive Local Engine vers Marketing Engine

## Statut

Acceptée.

## Contexte

Le Local Engine fonctionne déjà et possède des capacités opérationnelles importantes.

Une migration brutale créerait un risque de régression.

## Décision

Le Marketing Engine sera construit progressivement dans le dépôt existant.

Les capacités du Local Engine seront :

- documentées ;
- stabilisées ;
- découplées de leur interface ;
- exposées comme services métier ;
- intégrées progressivement au Marketing Engine.

## Phases

### Phase 1 — Coexistence

Le Local Engine continue de fonctionner sans modification risquée.

### Phase 2 — Découplage

La logique métier est isolée derrière des contrats stables.

### Phase 3 — Unification

Le Marketing Engine regroupe Local SEO, contenus, mini-sites, publications, analytics et automatisations.

### Phase 4 — Renommage

L’appellation Local Engine disparaît. Le Local SEO Engine devient un domaine interne du Marketing Engine.
