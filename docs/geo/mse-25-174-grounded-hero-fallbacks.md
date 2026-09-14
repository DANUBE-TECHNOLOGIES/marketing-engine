# MSE-25.174 — GEO grounded hero fallbacks V1

## Objectif

Aligner les fallbacks globaux du hero sur le contrat GEO de provenance déjà appliqué au header, aux sections génériques et au footer.

## Problèmes corrigés

En l'absence de contenu éditorial explicite, `HeroV2Renderer` pouvait auparavant :

- afficher la promesse générique `Votre agence vous accompagne dans la création de vos plus beaux voyages.` ;
- fabriquer un CTA primaire `Demander un devis` ;
- fabriquer sur le hero réseau un CTA secondaire `Découvrir nos voyages` ;
- résoudre ces CTA vers des parcours commerciaux alors qu'aucun CTA n'avait été publié.

## Contrat V1

- un sous-titre configuré reste prioritaire ;
- la description publique configurée de l'agence reste utilisable ;
- en l'absence de ces contenus, le sous-titre devient factuel et limité aux informations publiées par l'agence ;
- aucun libellé de CTA n'est créé automatiquement ;
- aucun href de CTA n'est résolu lorsqu'aucun libellé n'est publié ;
- les CTA structurés explicitement configurés restent inchangés ;
- les anciens champs `primaryButton` et `secondaryButton`, lorsqu'ils sont réellement renseignés, restent supportés ;
- le routage showcase continue de fonctionner uniquement à partir d'un libellé CTA publié correspondant.

## Hors périmètre

- titres locaux déjà dérivés de l'intention des pages publiques ;
- images et alt du hero ;
- agent IA, Orchestra, Knowledge/remediation ;
- fusion des PR empilées précédentes.

## Garde-fous

Le rendu ne doit pas transformer une absence de contenu en promesse commerciale, demande de devis, recommandation ou parcours de découverte inventé.
