# MSE-25.184 — GEO grounded reviews V1

## Objectif

Empêcher le renderer public des avis de produire des informations ou navigations non attestées par les données publiées du mini-site ou l'API publique des avis Google.

## Contrat

- aucun état de synchronisation n'est inventé en l'absence d'avis ;
- aucun auteur générique n'est substitué à un auteur absent ;
- la note, le nombre d'avis, les dates, les commentaires et réponses restent issus des données publiques synchronisées ;
- le bouton de dépôt d'avis n'est affiché qu'avec une URL réelle fournie par l'API ;
- les liens associés sont limités aux pages réellement publiées via la navigation canonique ;
- une section sans avis, sans URL de dépôt et sans texte explicitement publié n'est pas rendue.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
