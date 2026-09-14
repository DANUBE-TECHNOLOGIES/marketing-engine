# MSE-25.185 — GEO grounded testimonials V1

## Objectif

Empêcher le renderer de témoignages d'ajouter une preuve sociale qui n'existe pas dans le contenu publié.

## Règles

- aucune note par défaut n'est créée lorsqu'un témoignage n'a pas de `rating` ;
- aucune étoile n'est affichée sans note numérique explicite ;
- le titre de secours reste factuel (`Témoignages`) et ne déduit pas une relation de confiance ;
- une section sans témoignage exploitable n'est pas rendue ;
- texte, auteur et note restent strictement issus des données publiées.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
