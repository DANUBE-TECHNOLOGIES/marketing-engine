# MSE-25.181 — GEO grounded stats V1

## Objectif

Empêcher le renderer de statistiques public de transformer des chiffres publiés en preuve d’expertise non sourcée.

## Contrat

- un titre explicitement publié reste prioritaire ;
- le fallback est factuel : `Quelques chiffres` ;
- aucune qualification automatique d’`expertise` n’est ajoutée ;
- seules les statistiques disposant à la fois d’une valeur et d’un libellé publiés sont rendues ;
- une section sans statistique complète ne produit aucun bloc public.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
