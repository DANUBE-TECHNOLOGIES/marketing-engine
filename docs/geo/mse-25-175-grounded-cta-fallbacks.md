# MSE-25.175 — GEO grounded CTA fallbacks V1

## Objectif

Supprimer les promesses et actions commerciales fabriquées automatiquement par `CtaV2Renderer` lorsqu’une section CTA publiée ne contient pas elle-même de contenu éditorial ou de libellé d’action.

## Problèmes corrigés

Sur les pages internes, une section CTA vide pouvait auparavant afficher automatiquement :

- `Préparons votre prochain voyage` ;
- `Demander un devis` ;
- un lien vers la page contact alors qu’aucun CTA n’avait été publié.

## Contrat V1

- aucun titre CTA n’est créé par défaut ;
- aucun CTA primaire n’est créé par défaut ;
- une section sans titre, texte ni CTA publié ne produit aucun rendu ;
- les CTA structurés `primaryCta` et `secondaryCta` restent prioritaires ;
- les champs historiques `primaryButton` et `secondaryButton` restent supportés lorsqu’ils sont réellement renseignés ;
- un CTA publié sans href explicite conserve le fallback de routage vers contact ;
- la suppression historique des CTA blocks sur la home reste inchangée.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation. Aucun changement des PR empilées précédentes.
