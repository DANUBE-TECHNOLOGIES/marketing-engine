# MSE-25.176 — GEO grounded appointment V1

## Objectif

Aligner `AppointmentRenderer` sur le contrat GEO de provenance et sur la navigation canonique des mini-sites.

## Problèmes corrigés

Le renderer pouvait auparavant fabriquer automatiquement :

- `Rendez-vous personnalisé` ;
- `Prenons le temps de parler de votre voyage` ;
- `Choisissez un créneau pour échanger avec un conseiller.` ;
- `Prendre rendez-vous`.

Il pointait également vers l’ancien chemin `/sites/{slug}/contact`, indépendamment de la navigation réellement publiée.

## Contrat V1

- aucun kicker, titre, texte ou libellé CTA n’est créé automatiquement ;
- une section appointment sans contenu publié ne produit aucun rendu ;
- le CTA utilise un libellé structuré `primaryCta.label` ou l’ancien `primaryButton` lorsqu’il est réellement publié ;
- sans href explicite, le CTA n’est rendu que si une page contact figure dans `uniquePublishedNavigation(site)` ;
- ce lien réutilise `pageHref(site.slug, contactPage)` ;
- un href explicitement configuré reste pris en charge via le résolveur public canonique ;
- aucune route `/sites/{slug}/contact` n’est fabriquée.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation. Aucune PR précédente fusionnée.
