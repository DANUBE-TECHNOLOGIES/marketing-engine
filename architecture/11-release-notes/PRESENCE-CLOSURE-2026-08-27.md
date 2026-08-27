# Presence NAP — clôture de la couche d'intégration

Date : 2026-08-27
PR : #20 — `integration: Presence NAP on MSE-25.45 baseline`
Base : `feature/mse-25-45-conversion-optimization-loop`
Branche : `integration/presence-on-mse-25-45-20260824`

## Verdict de développement

La couche Presence est considérée fonctionnellement complète pour cette tranche dès lors que le workflow **Presence NAP Engine** reste vert sur le HEAD de sortie et qu'aucun blocker structurel n'est remonté par `GET /api/presence/closure-readiness`.

La clôture du développement est volontairement distincte de l'activation immédiate d'un pilote ou d'un rollout Google. Les secrets OAuth, le refresh token, `PRESENCE_GOOGLE_WRITES_ENABLED`, l'état des recoveries et les preuves de rollout sont des conditions runtime et non des critères de complétude du code.

## Périmètre livré

- identité canonique NAP et comparaison des fiches ;
- observation et découverte de citations ;
- matrice réseau agence × provider ;
- readiness des providers et catalogue ;
- remédiations manuelles et Google gérées ;
- audit des opérations et snapshots ;
- surveillance de propagation et SLA ;
- campagnes Presence avec plan figé, approbation, ledger d'exécution et vérification ;
- préflight de déploiement et pilotes canari / étendu / 50 % / 100 % ;
- recovery qualifiée, stabilisation, chaîne de confiance et régénération ;
- rapports figés et preuves de rollout ;
- snapshots de décision réseau et historique immutable ;
- acquittements critiques versionnés, chaînés et auditables ;
- détection des forks, cycles, parents manquants et racines incohérentes ;
- scellement progressif des chaînes legacy ;
- policy configurable `PRESENCE_ACK_SEALING_MIN_PERCENT` ;
- gel de la policy de gouvernance dans les snapshots ;
- détection et blocage des dérives critiques de gouvernance ;
- propagation du diagnostic jusqu'au final execution gate ;
- vue read-only d'execution readiness avant toute écriture ;
- audit final `/presence/closure` séparant clôture structurelle et activation runtime.

## Invariants de sortie

1. Aucun endpoint d'audit/readiness ne déclenche une écriture provider.
2. Toute mutation sensible conserve une confirmation explicite.
3. Les écritures Google restent soumises au runtime readiness et au toggle dédié.
4. Les promotions réseau sont soumises aux preuves de rollout, à la confiance recovery et au gate d'acquittement.
5. Une dérive critique non reconnue bloque la promotion.
6. Un durcissement de gouvernance non figé bloque la promotion et l'exécution finale.
7. Les preuves historiques ne sont jamais réécrites rétroactivement.
8. Les chaînes d'acquittements legacy restent compatibles mais leur niveau de scellement est visible.
9. La dette optionnelle n'est pas confondue avec un blocker de merge.
10. Le dernier gate d'exécution reste l'autorité avant toute écriture provider.

## Critères de merge de la PR #20

- PR mergeable sur sa vraie base MSE-25.45 ;
- branche `behind_by = 0` par rapport à la base ;
- workflow **Presence NAP Engine** vert sur le HEAD de sortie ;
- workflow **MSE-25.40 Local SEO Semantic Engine** vert afin de protéger l'intégration SEO existante ;
- `GET /api/presence/closure-readiness` sans blocker structurel dans l'environnement cible ;
- aucune régression découverte dans les fichiers partagés d'enregistrement des modules ;
- aucune écriture Google requise pour valider le merge.

## Éléments non bloquants après merge

Ces points relèvent de l'exploitation ou d'évolutions futures :

- activation/configuration DataForSEO si souhaitée ;
- configuration Apple Business Connect si souhaitée ;
- migration progressive des anciens acquittements vers un scellement 100 % explicite ;
- activation volontaire de `PRESENCE_GOOGLE_WRITES_ENABLED` uniquement au moment du pilote ;
- création des preuves réelles de rollout 25/50/100 au fil de l'exploitation ;
- résolution séparée du workflow transverse Search Console si celui-ci reste rouge pour des causes hors Presence.

## Procédure de sortie

1. Vérifier le HEAD de la PR et les workflows Presence/MSE-25.40.
2. Ouvrir `/presence/closure` sur l'environnement cible.
3. Si le verdict est `PRÊT À CLÔTURER`, considérer le développement Presence fermé.
4. Faire passer la PR #20 de draft à ready for review puis la merger selon le processus GitHub habituel.
5. Après merge, conserver les écritures Google désactivées tant qu'un pilote explicitement préparé n'est pas GO.
6. Traiter ensuite l'activation runtime comme une phase d'exploitation distincte, sans rouvrir la couche de développement sauf défaut réel.
