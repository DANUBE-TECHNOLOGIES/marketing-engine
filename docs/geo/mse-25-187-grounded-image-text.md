# MSE-25.187 — GEO grounded image text V1

## Objectif

Empêcher `ImageTextV2Renderer` de fabriquer une action ou un média lorsque la section publiée ne les fournit pas.

## Contrat

- le texte, le titre, l'eyebrow et l'image restent issus du contenu publié ;
- un CTA n'est rendu que si un label et un `href` explicites sont présents ;
- aucune absence de `href` n'est remplacée par une route `/contact` ;
- les schémas dangereux `javascript:`, `data:` et `vbscript:` sont refusés ;
- aucune image absente n'est remplacée par un placeholder public ;
- une section sans image ni contenu exploitable n'est pas rendue.

## Portée

Mini-sites publics / GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
