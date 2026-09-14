# MSE-25.183 — GEO grounded hours V1

## Objectif

Aligner le renderer public des horaires sur la provenance réelle des données du mini-site.

## Contrat

- le texte par défaut décrit uniquement les horaires publiés ;
- aucune promesse de conseil, de préparation de projet ou de disponibilité n'est ajoutée ;
- l'état de synchronisation Google Business Profile n'est affiché que lorsqu'un `syncedAt` réel existe ;
- aucun état « en attente de synchronisation » n'est inventé ;
- les liens associés sont dérivés uniquement des pages réellement publiées via `uniquePublishedNavigation(site)` et `pageHref()` ;
- aucune route `/equipe`, `/contact` ou `/services` n'est fabriquée automatiquement.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
