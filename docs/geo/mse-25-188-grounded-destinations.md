# MSE-25.188 — GEO grounded destinations V1

## Objectif

Limiter `DestinationsRenderer` aux destinations, contenus et pages réellement publiés sur le mini-site.

## Corrections

- suppression des fallbacks `Idées de voyages depuis …` et `Nos destinations du moment` ;
- suppression des conseils et promesses d'accompagnement générés automatiquement ;
- suppression de l'injection automatique des villes voisines ;
- suppression des routes fabriquées vers inspiration, services et contact ;
- navigation associée uniquement à partir de `uniquePublishedNavigation(site)` ;
- libellés de liens repris depuis les vrais `page.title` publiés ;
- carte destination non rendue sans titre ou nom exploitable ;
- introduction limitée aux champs `text` ou `description` réellement publiés ;
- fallback neutre `Destinations publiées`.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
