# MSE-25.169 — GEO canonical team Person identity V1

## Objectif

Garantir qu'une identité Schema.org `Person` publiée par le renderer d'équipe pointe toujours vers une URL canonique réellement disponible sur le mini-site.

## Problème corrigé

Le contrat MSE-25.152 utilisait auparavant une identité de type :

`/agence/<siteSlug>/equipe#person-<key>`

Or la route publique générique ne garantit pas l'existence d'une page éditoriale `/equipe`. Une section équipe peut être publiée sur une autre page, notamment la home. L'identité d'une personne pouvait donc être stable syntaxiquement tout en étant ancrée sur une URL publique inexistante.

## Contrat V1

Les personnes sont désormais identifiées sous la racine canonique toujours disponible de l'agence :

`/agence/<siteSlug>#person-<key>`

Le `worksFor` reste lié à la même entité canonique :

`/agence/<siteSlug>#travel-agency`

La clé de personne conserve les règles existantes : id, email, nom, titre ou fallback déterministe, normalisés sans création de faits supplémentaires.

## Garde-fous

- aucune dépendance à une page `/equipe` ;
- aucune création de `knowsAbout`, credential ou award ;
- aucune donnée prix, disponibilité ou réservation ;
- aucune modification du contenu éditorial visible ;
- aucun changement agent IA, Orchestra ou Knowledge/remediation.
