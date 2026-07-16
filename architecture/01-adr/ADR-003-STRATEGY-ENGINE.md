# ADR-003 — Strategy Engine

## Statut

Acceptée.

## Contexte

Le Marketing Engine ne doit pas uniquement produire et publier des contenus.

Il doit analyser la présence marketing et proposer des décisions explicables.

## Décision

Un Strategy Engine indépendant est créé.

Il consomme les observations issues de :

- Local SEO ;
- Analytics ;
- Search ;
- Content Quality ;
- Knowledge Completeness ;
- Publication Performance ;
- Offer Availability.

Il produit des StrategyRecommendation.

## Règles

- aucune recommandation sans observations ;
- toute recommandation possède une explication ;
- toute recommandation possède un niveau de confiance ;
- toute recommandation possède un impact attendu ;
- les décisions sensibles restent soumises à validation humaine.

## Exemple

Observation :
- baisse de position sur « voyage Hongrie » ;
- contenu ancien ;
- aucune publication récente ;
- offre active disponible.

Recommandation :
- rafraîchir la connaissance Hongrie ;
- créer un nouveau ContentAsset ;
- générer une landing page ;
- préparer un Google Post ;
- planifier une newsletter.
