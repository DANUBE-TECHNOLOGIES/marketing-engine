# MSE-25.162 — Collection WebPage consolidation V1

## Objectif

Éviter qu'une page de collection publique publie deux objets JSON-LD distincts portant le même identifiant `#webpage` : un WebPage canonique complet et un second fragment CollectionPage uniquement destiné à rattacher l'ItemList.

## Règle

`consolidateCollectionWebPage(webPage, schemas)` recherche uniquement un fragment :

- portant exactement le même `@id` que le WebPage canonique ;
- typé `CollectionPage`.

Il fusionne alors :

- le type `CollectionPage` dans le type du WebPage ;
- le `mainEntity` du fragment (l'`ItemList`) dans le WebPage canonique.

Le fragment CollectionPage est ensuite retiré de la liste à rendre. L'ItemList reste une entité JSON-LD séparée avec son propre `@id`.

## Destinations

Le graphe de collection est désormais construit au niveau du routeur public à partir des mêmes sections visibles et triées que le renderer. `DestinationsRenderer` ne publie plus de JSON-LD et reste uniquement responsable des cartes visibles.

## Inspiration

La route `/inspiration` consolide le fragment CollectionPage retourné par `buildInspirationCollectionSchemas()` dans son WebPage canonique puis ne rend séparément que l'ItemList.

## Autorités préservées

- aucune URL de carte ou d'article n'est recalculée différemment ;
- les ItemList existants restent inchangés ;
- aucun prix, stock, disponibilité, réservation ou expertise n'est ajouté ;
- les relations FAQ, publisher, about et autres attributs du WebPage canonique sont conservés.
