# MSE-25.172 — GEO grounded generic section fallbacks V1

## Objectif

Rendre les renderers fallback de `PublicSiteSections` strictement factuels lorsque le contenu éditorial d'une section est absent ou incomplet.

## Problèmes corrigés

Les fallbacks génériques pouvaient auparavant :

- promettre un accompagnement `avant, pendant et après` ;
- promettre la création des `plus beaux voyages` ;
- afficher `Notre expertise` sans source éditoriale ;
- fabriquer un CTA vers `/contact` même si cette page n'était pas publiée ;
- annoncer des avis Google à venir sans source active dans la section fallback.

## Contrat V1

- `AgencySection` et `HeroSection` utilisent un fallback limité aux informations publiques de l'agence ;
- `CardsSection` utilise `Contenu publié` et ne crée pas d'expertise ;
- `ReviewsSection` reste sur l'existence ou l'absence d'avis publiés dans la section ;
- `HeroSection` et `CtaSection` résolvent la page contact depuis `uniquePublishedNavigation(site)` ;
- aucun bouton contact n'est rendu si cette page n'est pas publiée ;
- les libellés de CTA réutilisent d'abord la configuration éditoriale, puis le titre public de la page contact.

## Garde-fous

- aucun claim de prix, disponibilité, réservation ou stock ;
- aucun `Notre expertise` automatique ;
- aucun `/contact` aveugle ;
- aucun changement des contenus éditoriaux explicitement configurés ;
- aucun changement agent IA, Orchestra ou Knowledge/remediation.
