# MSE-25.166 — GEO areaServed visible parity V1

## Objectif

Empêcher le graphe canonique `TravelAgency.areaServed` de publier davantage de villes que le jeu de proximité réellement exposé par le mini-site.

## Contrat

- `resolvedTargetCities()` reste l'autorité éditoriale unique pour le premier cercle local.
- Le jeu public canonique est plafonné à 6 villes cibles, en plus de la ville d'implantation.
- Une demande interne avec une limite supérieure ne peut plus étendre silencieusement `areaServed` au-delà du jeu visible.
- `PublicAgencyReferenceFacts` publie ces mêmes villes en microdata `areaServed`.
- `LocalSeoAreaLinks` affiche le même premier cercle sur la home.
- Les zones étendues restent du contenu visible de contexte ; elles ne sont pas promues automatiquement dans `TravelAgency.areaServed`.
- Les `targetCities` explicites restent prioritaires sur la configuration statique et sont dédupliquées.

## Effet GEO

Le graphe ne peut plus transformer une liste interne plus large en revendication géographique cachée. Les moteurs génératifs disposent d'une zone de proximité attribuable et vérifiable dans le contenu public.
