# MSE-25.35 — Flexible Payment Network Rollout

## Objectif

Transformer le readiness réseau MSE-25.34 en un mécanisme de rollout multi-agences contrôlé, prévisualisable et explicitement confirmé.

## Principes

- aucune agence non `ready` ne peut être incluse dans un rollout ;
- aucune écriture sans `confirm=true` ;
- preview réseau déterministe et fingerprintée ;
- chaque mini-site conserve son propre fingerprint MSE-25.32 ;
- le rollout ne crée aucune policy et n'active aucune agence implicitement ;
- les mini-sites `unconfigured`, `disabled`, `invalid`, `no-eligible-page` et `deployed` sont exclus des écritures ;
- l'exécution réutilise l'executor MSE-25.32 afin de conserver versioning, idempotence et rollback existants ;
- un échec sur une agence est remonté explicitement, sans transformer silencieusement les autres états.

## Contrat de preview

Le preview retourne :

- un fingerprint réseau ;
- la liste des agences éligibles ;
- pour chaque agence, le fingerprint de preview MSE-25.32 et le nombre de blocs proposés ;
- les agences exclues et leur statut readiness ;
- aucun write.

## Contrat d'apply

L'apply exige :

- `confirm=true` ;
- le fingerprint réseau exact ;
- une liste explicite de `siteIds` à déployer.

Chaque site sélectionné doit encore être présent dans le preview et `ready`. Le moteur appelle ensuite l'executor MSE-25.32 avec le fingerprint individuel correspondant.

## Hors périmètre

- création automatique de policy ;
- activation réseau par défaut ;
- modification des promesses financières ;
- rollout sans sélection explicite ;
- landing SEO ou campagne marketing.
