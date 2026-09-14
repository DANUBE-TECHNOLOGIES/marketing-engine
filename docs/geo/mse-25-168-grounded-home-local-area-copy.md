# MSE-25.168 — Grounded home local area copy V1

## Objectif

Conserver la couverture locale visible de la home et les communes ciblées sans transformer automatiquement cette couverture éditoriale en promesse opérationnelle ou en expertise implicite.

## Contrat

- La ville principale reste l'implantation publique de l'agence.
- Le premier cercle vient uniquement de `resolvedTargetCities()` et reste borné par le contrat MSE-25.166.
- La zone élargie vient uniquement de `resolvedExtendedTargetCities()` et reste présentée comme contexte géographique distinct.
- Les textes utilisent un vocabulaire de publication et de présentation du mini-site.
- Les liens internes renvoient vers les services, destinations et inspirations publiés ainsi que vers les coordonnées publiques.
- `PublicAgencyReferenceFacts` reste le bloc visible de référence attaché à l'entité TravelAgency canonique.

## Interdits

La home locale générée ne doit pas affirmer automatiquement :

- un accompagnement des voyageurs des communes ciblées ;
- un suivi depuis les premières recherches jusqu'au retour ;
- des destinations conseillées ;
- une recherche, un devis ou un rendez-vous garantis ;
- un prix, un stock, une disponibilité ou une autorité de réservation.

## Portée

Mini-sites GEO uniquement. Aucun changement Orchestra, agent IA ou Knowledge/remediation.
