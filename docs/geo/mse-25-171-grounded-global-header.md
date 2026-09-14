# MSE-25.171 — GEO grounded global header V1

## Objectif

Rendre le header commun des mini-sites strictement fondé sur les informations publiques disponibles, sans promesse de service automatique ni route contact inventée.

## Problème corrigé

Le header global affichait sur toutes les pages :

- `Conseils personnalisés` ;
- `Accompagnement avant, pendant et après` ;
- un CTA `Demander un devis` pointant systématiquement vers `/contact`.

Ces formulations et cette route n'étaient pas garanties par la navigation publiée de chaque mini-site.

## Contrat V1

- la trustbar conserve l'implantation locale et le statut d'ouverture public ;
- les promesses génériques de conseil et d'accompagnement sont supprimées ;
- le CTA contact n'est rendu que si une page `contact` existe dans `uniquePublishedNavigation(site)` ;
- son href réutilise `pageHref()` ;
- son libellé visible réutilise le titre public de la page.

## Garde-fous

- aucun `/contact` codé en dur pour le CTA principal ;
- aucune promesse automatique d'accompagnement sur toutes les pages ;
- aucun changement du contenu éditorial configuré ;
- aucun changement agent IA, Orchestra ou Knowledge/remediation.
