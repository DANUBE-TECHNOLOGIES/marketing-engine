# MSE-25.161 — Canonical WebPage semantic consolidation V1

## Objectif

Éviter de publier plusieurs objets JSON-LD distincts portant le même identifiant canonique `#webpage` pour une page générale de mini-site.

## Règle

`buildLocalWebPageSchema()` / `buildServiceAwareWebPageSchema()` reste la source du nœud WebPage principal. Les informations produites par `buildPageSemanticsSchema()` sont fusionnées dans ce même objet avant rendu :

- type spécialisé (`ContactPage`, `AboutPage`, `CollectionPage`) ;
- `datePublished` ;
- `dateModified`.

Le merge n'est effectué que si les deux fragments portent exactement le même `@id` canonique.

## Autorités préservées

La consolidation n'écrase aucune relation existante du WebPage. En particulier :

- Services conserve l'`OfferCatalog` comme `mainEntity` ;
- le rattachement FAQ `hasPart` reste présent ;
- l'agence locale reste publisher/about selon le contrat existant.

## Hors périmètre

Les schémas de collections Destinations et Inspiration publient encore un fragment `CollectionPage#webpage` afin d'attacher leur `ItemList`. Leur consolidation sera traitée séparément pour ne pas mélanger changement de type et changement de `mainEntity` dans le même incrément.

Aucun prix, stock, disponibilité, réservation ou expertise n'est ajouté par cette évolution.
