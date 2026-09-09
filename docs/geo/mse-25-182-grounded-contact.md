# MSE-25.182 — GEO grounded contact V1

## Objectif

Aligner le renderer Contact sur le contrat GEO de provenance des mini-sites publics.

## Contrat

- les coordonnées visibles proviennent exclusivement des données publiques de l’agence ;
- aucune mention d’état de mise à jour n’est inventée lorsqu’une donnée manque ;
- la carte d’avis Google n’est publiée que lorsqu’une URL d’avis Google est configurée ;
- la navigation associée provient uniquement des pages réellement publiées via `uniquePublishedNavigation(site)` et `pageHref()` ;
- aucun lien services, destinations ou inspiration n’est fabriqué par simple convention de slug ;
- le texte de fallback décrit seulement les coordonnées publiques et la couverture locale configurée.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
