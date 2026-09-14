# MSE-25.180 — GEO grounded flexible payment V1

## Objectif

Aligner `FlexiblePaymentRenderer` sur le contrat GEO de provenance des mini-sites publics.

## Contrat

- les modalités d’échelonnement proviennent uniquement de `installmentCounts` publiés ;
- le mode de frais n’est affiché que lorsqu’il est explicitement configuré ;
- aucun texte ne promet qu’une solution sera étudiée, proposée ou adaptée à une réservation ;
- une section sans titre, texte, modalités, disclaimer ni action publiée ne rend rien ;
- un CTA n’est rendu que si son libellé et son href sont explicitement configurés ;
- aucun routage automatique vers contact ou demande de devis n’est fabriqué.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
