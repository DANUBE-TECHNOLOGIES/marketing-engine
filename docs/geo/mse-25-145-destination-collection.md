# MSE-25.145 — GEO destination collection V1

## Objectif

Relier la page publique `destinations` d’un mini-site aux destinations qu’elle affiche réellement, sans introduire un catalogue global ou des destinations absentes de l’interface.

## Source de vérité

Le renderer public et le JSON-LD partagent désormais les mêmes helpers :

- `destinationSectionItems(section)` pour extraire les items réellement utilisés par les sections Destination ;
- `destinationHref(site, item)` pour résoudre leur URL publique canonique.

La couche GEO n’invente donc ni destination ni URL.

## Graphe publié

Sur la page `destinations` uniquement :

- l’entité existante `#webpage` est également typée `CollectionPage` ;
- son `mainEntity` pointe vers un `ItemList` stable `#destination-list` ;
- chaque `ListItem` contient sa position, son nom, son URL publique et une référence `TouristDestination` avec le même `#destination` que la fiche détaillée.

Le graphe est émis une seule fois, depuis la première section Destination rendue, tout en agrégeant toutes les sections Destination visibles de la page.

## Garde-fous

- dédoublonnage par URL publique ;
- exclusion des items sans nom ou sans URL exploitable ;
- exclusion des liens `mailto:`, `tel:` et ancres ;
- aucune publication hors de la page `destinations` ;
- aucune donnée de prix, disponibilité, stock, réservation ou expertise inférée.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
