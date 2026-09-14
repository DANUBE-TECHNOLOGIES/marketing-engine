# MSE-25.144 — GEO destination audience parity V1

## Objectif

Publier les audiences d’une destination uniquement lorsqu’elles existent dans le champ canonique `Destination.audiences`, puis garantir une parité stricte entre le contenu visible et le JSON-LD.

## Source de vérité

La seule source autorisée est `destination.audiences`.

Le helper `destinationAudiences(destination)` :

- ignore les valeurs vides ;
- normalise uniquement les espaces ;
- dédoublonne sans modifier le sens ;
- conserve au maximum 12 valeurs ;
- ne déduit aucune audience depuis `type`, `summary`, `tagline`, `highlights`, relations, recommandations ou scores.

## Publication publique

Lorsque des audiences existent :

- elles sont affichées dans le bloc visible `Idéal pour` ;
- exactement le même tableau normalisé alimente `TouristDestination.touristType`.

Lorsque le tableau est vide, ni le bloc visible ni `touristType` ne sont publiés.

## Limites

Cette évolution ne crée aucune expertise implicite et n’ajoute aucun fait transactionnel : pas de prix, disponibilité, stock, réservation ou `knowsAbout`.

## Portée

Mini-sites GEO uniquement. Aucun changement sur l’agent IA, Orchestra ou le sous-système Knowledge/remediation.
