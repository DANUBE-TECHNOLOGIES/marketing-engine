# MSE-25.163 — Canonical breadcrumb linkage V1

## Objectif

Donner au fil d’Ariane une identité canonique stable et le relier explicitement au WebPage qu’il décrit, sans modifier les éléments visibles ni inventer de navigation.

## Sémantique

Schema.org définit `breadcrumb` sur `WebPage` avec `BreadcrumbList` comme valeur possible. La normalisation publique applique donc le contrat suivant :

- un `BreadcrumbList` dérive l’URL de la page depuis son dernier `ListItem` existant ;
- il reçoit `@id: <pageUrl>#breadcrumb` ;
- il reçoit `mainEntityOfPage` vers `<pageUrl>#webpage` ;
- un `WebPage` portant `url: <pageUrl>` reçoit `breadcrumb` vers le même `<pageUrl>#breadcrumb`.

## Implémentation

La transformation est centralisée dans `canonicalizeJsonLd()` et appelée juste avant sérialisation par `JsonLd`.

Elle ne s’applique qu’aux types `BreadcrumbList` et `WebPage`. Les autres schémas sont retournés inchangés.

## Garde-fous

- aucun `ListItem` n’est ajouté, supprimé ou réordonné ;
- aucune URL de navigation n’est inventée ;
- l’identité est dérivée uniquement du dernier item déjà publié ;
- les propriétés existantes `@id`, `mainEntityOfPage` et `breadcrumb` sont conservées si elles sont déjà présentes ;
- aucun prix, disponibilité, stock, réservation, note ou expertise n’est ajouté.
