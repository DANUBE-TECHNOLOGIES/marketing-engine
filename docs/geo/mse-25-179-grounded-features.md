# MSE-25.179 — GEO grounded features V1

## Objectif

Aligner `FeaturesV2Renderer` sur le contrat GEO de provenance.

## Contrat

- aucun service n’est ajouté s’il n’existe pas dans `content.items` ;
- aucune expertise Business Travel ou voyage de groupe n’est déduite ;
- les textes de fallback décrivent uniquement des services publiés ;
- une action de carte n’est rendue que si un href et un libellé sont explicitement publiés ;
- la navigation associée provient de `uniquePublishedNavigation(site)` et réutilise `pageHref()` ainsi que les titres publics ;
- aucune route contact, destinations ou inspiration absente n’est fabriquée.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
