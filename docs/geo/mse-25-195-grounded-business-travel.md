# MSE-25.195 — GEO grounded Business Travel V1

## Constat

La route applicative `business-travel` est légitime et gérée explicitement depuis MSE-25.194, mais son contenu public historique émettait encore de nombreuses capacités commerciales codées en dur : tarifs négociés, assistance 24/7, géolocalisation, reporting, paiements centralisés, application mobile et accompagnement de bout en bout.

Ces affirmations n’étaient pas reliées à une autorité éditoriale ou runtime du mini-site.

## Correction

La page Business Travel conserve sa route publique et son intention locale, mais son contenu devient strictement factuel :

- titre local `Voyages d’affaires à {ville}` ;
- description limitée aux informations publiques et coordonnées de l’agence ;
- téléphone et email affichés uniquement lorsqu’ils existent dans les données agence ;
- liens Contact et Services uniquement si ces pages sont réellement publiées ;
- aucun CTA vers une route devis fabriquée ;
- aucune capacité opérationnelle ou technologique supposée.

Les metadata suivent la même règle et ne revendiquent plus transport, hébergement, assistance, suivi ou pilotage.

## Garde-fous

Le test `mse-25-195-geo-grounded-business-travel.test.mjs` interdit explicitement le retour des principales promesses historiques et exige une navigation issue de `uniquePublishedNavigation(site)`.

La route reste canonique, indexable et présente dans le graphe public géré par MSE-25.194.
