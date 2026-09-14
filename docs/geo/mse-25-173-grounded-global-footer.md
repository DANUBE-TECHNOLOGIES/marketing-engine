# MSE-25.173 — GEO grounded global footer V1

## Objectif

Aligner le footer global sur les mêmes règles de provenance que le header, les pages locales et les autres surfaces GEO.

## Problèmes corrigés

Le footer global pouvait auparavant :

- promettre des voyages `uniques, adaptés à vos envies` ;
- afficher `Destinations conseillées` sans source éditoriale ;
- afficher `accompagnement personnalisé` sur toutes les pages ;
- créer systématiquement une route `/inspiration` même si elle n'était pas publiée.

## Contrat V1

- la description de l'agence reste limitée aux coordonnées et contenus publiés ;
- les pages du footer proviennent de `uniquePublishedNavigation(site)` ;
- les hrefs réutilisent `pageHref()` ;
- les libellés visibles réutilisent les titres publics des pages ;
- seules les surfaces publiques pertinentes (`services`, `destinations`, `inspiration`, `avis`, `contact`) sont proposées lorsqu'elles existent ;
- les mentions légales et la politique de confidentialité restent des routes institutionnelles gérées séparément ;
- les microdonnées NAP de l'entité `TravelAgency` sont conservées.

## Garde-fous

- aucune expertise ou recommandation inventée ;
- aucun prix, stock, disponibilité ou réservation ;
- aucune page éditoriale absente fabriquée dans le footer ;
- aucun changement agent IA, Orchestra ou Knowledge/remediation.
