# MSE-25.170 — GEO grounded team navigation V1

## Objectif

Supprimer les liens internes fabriqués en dur depuis les sections équipe et n'afficher que des pages réellement publiées sur le mini-site.

## Problème corrigé

`TeamRenderer` générait systématiquement trois liens vers `/services`, `/destinations` et `/contact`, avec des libellés commerciaux génériques. L'existence de ces pages n'est pas garantie pour chaque mini-site.

## Contrat V1

Le renderer reçoit désormais la page courante et réutilise `contextualJourneyItems(site, page?.slug, 3)`.

Ce resolver s'appuie sur `uniquePublishedNavigation(site)` :

- seules les pages publiées peuvent être proposées ;
- la page courante est exclue ;
- les hrefs sont ceux du contrat de navigation publique ;
- le libellé visible est le titre public de la page ;
- aucun fallback de route commerciale n'est inventé.

## Garde-fous

- aucun `/services`, `/destinations` ou `/contact` codé en dur dans la navigation équipe ;
- aucun CTA prix, disponibilité ou réservation ;
- aucun changement des entités `Person` ou `TravelAgency` ;
- aucun changement agent IA, Orchestra ou Knowledge/remediation.
