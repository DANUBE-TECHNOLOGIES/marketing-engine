# MSE-25.142 — GEO destination editorial relations V1

## Objectif

Exposer les relations entre destinations dans le graphe GEO uniquement lorsqu'elles correspondent à une relation éditoriale explicite et à une destination réellement publique sur le mini-site.

## Contrat public

Le backend produit uniquement `editorialRelations: [{ name, href }]`.

Une relation est éligible si et seulement si :

- `DestinationRelation.origin === "manual"` ;
- la destination cible appartient au même tenant ;
- la destination cible est `published` ;
- la destination cible est effectivement exposée par le mini-site public ;
- la cible est différente de la destination courante.

Les champs internes `score`, `metadata`, `reasons` et les recommandations calculées ne sont pas publiés.

## Parité visible / structurée

Chaque relation publique est rendue comme un lien visible sous « Vous aimerez aussi » et la même URL canonique est ajoutée à `WebPage.relatedLink`.

Aucune relation n'est ajoutée au JSON-LD si elle n'existe pas dans le rendu public.

## Hors périmètre

- recommandations calculées ;
- prix, disponibilité, stock ou réservation ;
- `sameAs`, `isSimilarTo` ou `knowsAbout` ;
- agent IA, Orchestra ou Knowledge/remediation.
