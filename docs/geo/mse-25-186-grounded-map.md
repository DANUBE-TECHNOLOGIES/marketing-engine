# MSE-25.186 — GEO grounded map V1

## Objectif

Limiter `MapRenderer` aux faits de localisation réellement publiés et aux pages réellement publiées du mini-site.

## Garanties

- aucune carte n'est rendue sans adresse, code postal ou ville publiée ;
- le texte par défaut décrit uniquement la localisation publiée ;
- aucune promesse automatique d'échange avec un conseiller ou de préparation de voyage ;
- les liens associés proviennent exclusivement de `uniquePublishedNavigation(site)` ;
- les URL et libellés utilisent `pageHref()`, `pageSlug()` et `page.title` ;
- aucune route `/contact`, `/equipe` ou `/services` n'est fabriquée ;
- le lien externe Google Maps reste calculé uniquement à partir des faits de localisation disponibles.

## Portée

Mini-sites publics / GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
