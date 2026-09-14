# MSE-25.143 — GEO destination map parity V1

## Objectif

Conserver la valeur de désambiguïsation géographique des pages Destination sans publier de coordonnées invalides ou impossibles à vérifier depuis la page publique.

## Contrat

Les coordonnées sont acceptées uniquement si latitude et longitude sont numériques, finies et comprises dans les bornes WGS84 : latitude [-90, 90], longitude [-180, 180].

Lorsqu'elles sont valides :

- `TouristDestination.geo` utilise ces coordonnées validées ;
- `TouristDestination.hasMap` pointe vers une carte générée à partir des mêmes coordonnées ;
- la page affiche un lien visible « Voir sur la carte » vers exactement cette URL.

Lorsqu'elles sont absentes ou invalides, la page n'affiche pas de lien de carte et le rendu final n'expose pas de `geo` exploitable.

## Principes GEO

- même source pour le fait structuré et son contrôle visible ;
- aucune coordonnée inventée ou corrigée automatiquement ;
- aucune inférence d'expertise ou d'audience ;
- aucun prix, disponibilité, stock ou réservation.

## Hors périmètre

Agent IA, Orchestra et Knowledge/remediation.
