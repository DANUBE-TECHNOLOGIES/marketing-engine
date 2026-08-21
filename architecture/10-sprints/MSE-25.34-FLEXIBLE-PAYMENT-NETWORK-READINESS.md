# MSE-25.34 — Flexible Payment Network Readiness

## Objectif

Préparer le déploiement réseau du service « paiement en plusieurs fois » sans appliquer automatiquement de règle financière à une agence qui n’est pas explicitement configurée.

Cette couche mesure la préparation de chaque mini-site à recevoir les blocs MSE-25.32 et produit un rapport réseau en lecture seule.

## Principes

- aucune écriture de policy ;
- aucun apply de bloc ;
- aucune promesse commerciale inventée ;
- une agence n’est `ready` que si sa policy est activée, valide et qu’au moins une page publiée éligible existe ;
- la présence d’un bloc déjà déployé est distinguée de la simple capacité à le déployer ;
- les agences sans configuration explicite restent `unconfigured` ;
- les pages brouillon ne comptent jamais comme surface de déploiement.

## États agence

- `unconfigured` : aucune policy persistée ;
- `disabled` : policy existante mais service désactivé ;
- `invalid` : policy activée mais incohérente ;
- `no-eligible-page` : policy valide mais aucune home/billetterie publiée éligible ;
- `ready` : au moins une proposition de bloc peut être générée ;
- `deployed` : aucun nouveau bloc nécessaire et au moins un bloc MSE-25.32 est déjà présent.

## Sortie réseau

Le rapport doit fournir :

- nombre total de mini-sites ;
- nombre configuré / activé / ready / deployed ;
- couverture en pourcentage ;
- détail agence par agence ;
- raisons de blocage explicites ;
- aucune écriture.

## Suite possible

Une future couche de rollout réseau pourra consommer ce rapport pour proposer un preview multi-agences puis un apply explicitement confirmé, sans mélanger cette responsabilité avec MSE-25.34.
