# MSE-25.177 — GEO grounded offers V1

## Objectif

Aligner `OffersRenderer` sur le contrat GEO de provenance : une offre publique ne doit produire que des faits, prix, liens et parcours réellement publiés.

## Problèmes corrigés

Le renderer pouvait auparavant :

- affirmer que des offres étaient sélectionnées par l’agence sans source éditoriale explicite ;
- promettre les « meilleures opportunités » ;
- transformer automatiquement une offre sans lien en demande de devis ;
- préfixer tout prix par « À partir de » sans que cette sémantique soit publiée ;
- créer systématiquement des liens vers destinations, services et contact, même lorsque ces pages n’étaient pas publiées ;
- annoncer que de prochaines offres « arrivent bientôt » sans autorité de contenu.

## Contrat V1

- le titre et l’introduction de fallback restent factuels et décrivent des offres publiées ;
- une action d’offre n’est rendue que si `item.href` existe réellement ;
- un libellé explicite d’action est conservé, sinon un libellé descriptif neutre est dérivé du titre publié ;
- un prix existant est présenté comme `Prix publié`, sans inventer de prix d’appel ;
- les liens associés proviennent uniquement de `uniquePublishedNavigation(site)` et utilisent `pageHref()` ainsi que les titres publics ;
- l’état vide indique uniquement qu’aucune offre n’est actuellement publiée.

## Garde-fous

- aucun devis, disponibilité, stock ou prix d’appel inventé ;
- aucune promesse de sélection ou de conseil personnalisée injectée par défaut ;
- aucune route éditoriale fabriquée ;
- aucun changement agent IA, Orchestra ou Knowledge/remediation.
