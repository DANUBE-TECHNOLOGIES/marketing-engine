# MSE-25.146 — GEO inspiration collection V1

## Objectif

Relier la page publique `inspiration` aux articles qu’elle affiche réellement, tout en respectant la canonicalisation éditoriale réseau déjà utilisée par les fiches Inspiration.

## Deux URL distinctes lorsque nécessaire

Une carte Inspiration peut être visible sur le mini-site local tout en ayant une agence propriétaire de son canonical.

Le contrat distingue donc :

- `ListItem.url` : URL locale réellement utilisée par la carte visible ;
- `Article.url` et `Article.@id` : URL canonique éditoriale, déterminée par `editorialCanonical.siteSlug` lorsqu’il existe.

Cette distinction évite de créer plusieurs identités Article pour le même contenu réseau.

## Identité Article

Chaque fiche Inspiration publie désormais un identifiant stable :

`<canonical>#article`

La collection réutilise exactement cet identifiant.

## Graphe de collection

La page `/agence/<site>/inspiration` publie :

- le même `#webpage`, également typé `CollectionPage` ;
- un `ItemList` stable `#inspiration-list` ;
- des `ListItem` contenant position, titre, URL locale visible et référence vers l’Article canonique.

## Garde-fous

- seules les inspirations déjà retournées par l’API publique ciblée agence sont considérées ;
- les items sans titre, slug ou canonical exploitable sont ignorés ;
- dédoublonnage par URL canonique Article ;
- maximum 24 éléments, aligné sur l’index public ;
- aucune donnée de prix, disponibilité, stock, réservation ou expertise inférée.

## Portée

Mini-sites GEO uniquement. Aucun changement agent IA, Orchestra ou Knowledge/remediation.
