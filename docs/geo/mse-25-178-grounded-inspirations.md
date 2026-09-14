# MSE-25.178 — GEO grounded inspirations V1

## Objectif

Aligner `InspirationsRenderer` sur le contrat de provenance GEO des mini-sites publics.

## Contrat

- les textes par défaut restent factuels et décrivent uniquement des contenus publiés ;
- aucune sélection, recommandation, expertise ou promesse d’accompagnement n’est déduite ;
- les cartes conservent uniquement les titres, catégories, descriptions, médias et slugs présents dans les contenus publiés ;
- la navigation associée provient de `uniquePublishedNavigation(site)` ;
- les hrefs de navigation réutilisent `pageHref()` et les titres publics ;
- aucune route `destinations`, `services` ou `contact` absente n’est fabriquée.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
