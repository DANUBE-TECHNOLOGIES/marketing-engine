# MSE-25.189 — GEO strict CTA href provenance V1

## Objectif

Empêcher `CtaV2Renderer` de fabriquer une destination publique à partir d'un simple libellé de bouton.

## Contrat

- un CTA n'est rendu que si `label` et `href` sont explicitement publiés ;
- les anciens champs `primaryButton` / `secondaryButton` ne sont plus transformés en `/contact` ;
- le libellé seul ne déclenche plus de déduction automatique vers `demande-devis` ;
- les schémas dangereux `javascript:`, `data:` et `vbscript:` sont refusés ;
- un href explicite reste normalisé par le helper public sans fallback de page implicite.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
