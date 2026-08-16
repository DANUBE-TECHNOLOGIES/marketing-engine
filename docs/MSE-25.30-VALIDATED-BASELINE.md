# MSE-25.30 — Baseline runtime validée

Ce document enregistre la baseline MSE-25.30 actuellement validée par GitHub Actions. Il est volontairement séparé des scripts runtime protégés afin qu'une promotion de baseline ne modifie pas elle-même la chaîne de sécurité contrôlée par le preflight.

## Baseline validée

```text
MSE_25_30_VALIDATED_BASE_SHA=74c0dfc1443a4757c953fa4c23cf4d545f208b66
```

Validation associée :

```text
Workflow   : MSE-25 Search Console and indexation checks
Run        : 31951825120
Event      : push
Conclusion : success
```

Cette exécution valide sous Node 22 l'ensemble des tests backend MSE-25.30, le chargement réel des modules SEO, les tests d'indexation frontend et les lints associés.

La baseline inclut notamment les durcissements éditoriaux et opératoires suivants :

- promotion d'une page publiée sans contenu visible en blocage `EMPTY_INDEXABLE_CONTENT`, tout en conservant les contenus simplement courts au niveau warning ;
- naturalisation déterministe des formulations locales et des métadonnées projetées, notamment les contractions françaises et la suppression des répétitions de type `TUI STORE Amilly à Amilly` ;
- ajout d'une différenciation éditoriale déterministe sur les pages `services`, `engagements` et `destinations`, sans inventer de communes ;
- exclusion réseau explicite et auditable, avec `tui-store-melun` exclu par défaut et surcharge possible via `MSE_25_30_EXCLUDED_SITE_SLUGS` ;
- exclusion du même périmètre dans le gate sitemap projeté ;
- exposition des agences exclues dans le preview réseau ;
- verrouillage du périmètre d'exclusion dans le fingerprint approuvé afin qu'un changement d'environnement entre preview et apply interdise toute écriture ;
- validation post-rollout renforcée pour traiter correctement les changements de niveau page `seoTitle` et `metaDescription`, tout en conservant la validation historique des blocs Website Designer V2 ;
- conservation dans le rapport de rollout du périmètre d'exclusion approuvé (`excludedSiteSlugs` et `excludedAgencies`) afin de prouver après coup les agences volontairement hors lot ;
- audit croisé de ce périmètre contre les agences réellement écrites et le `rollbackManifest` : une agence exclue réapparue provoque `MSE_25_30_ROLLOUT_EXCLUDED_SCOPE_VIOLATION` et le rapport n'est pas certifié ;
- exigence de `approvedScopeAudit.ok=true` avant toute validation post-rollout, avec recalcul indépendant de la preuve pour empêcher la réutilisation d'un rapport ancien ou incohérent ;
- persistance de `approvedScope` et `approvedScopeAudit` jusque dans le rapport post-rollout final afin que la chaîne de preuve reste complète ;
- audit d'intégrité du rollback : chaque entrée du manifeste doit correspondre exactement à une page `changed=true` du rapport d'apply avec les mêmes `agencyId`, `siteSlug`, `slug` et `rollbackVersionId`, sans entrée ajoutée, manquante ou dupliquée ;
- le rollback contextuel exige également la preuve `approvedScopeAudit` avant toute restauration, sauf activation volontaire du mode legacy déjà explicitement protégé ;
- protection de `backend/package.json` dans `RUNTIME_PROTECTED_PATHS`, car les commandes npm sélectionnent les wrappers opérateur sécurisés d'apply, rollback et validation ;
- exigence des capacités de durcissement dans le health check du preflight.

Le répertoire complet `backend/src/modules/minisite-seo-enrichment`, `backend/package.json` ainsi que les scripts de rollout MSE-25.30 restent protégés par `RUNTIME_PROTECTED_PATHS`. Toute dérive de ces chemins après cette baseline doit provoquer `MSE_25_30_PREFLIGHT_RUNTIME_CHANGED`.

## Utilisation sur la machine d'administration

Après avoir synchronisé la branche et redémarré le backend avec le nouveau runtime, utiliser cette baseline explicitement avant le preflight :

```bash
export MSE_25_30_VALIDATED_BASE_SHA=74c0dfc1443a4757c953fa4c23cf4d545f208b66
npm run mse-25.30:preflight
```

Le HEAD peut être plus récent que cette baseline uniquement si les commits intermédiaires ne modifient aucun chemin runtime protégé. Le preflight vérifie cette propriété avant tout appel réseau de preview.

Le preview doit rendre explicites `excludedSiteSlugs` et `excludedAgencies`. Par défaut, `tui-store-melun` ne fait donc pas partie du plan de rollout. Pour modifier volontairement ce périmètre, définir `MSE_25_30_EXCLUDED_SITE_SLUGS` avant de relancer le preflight ; tout changement du plan produit un nouveau fingerprint et rend un ancien rapport impropre à l'apply.

Après un apply réussi, le rapport de rollout doit contenir `approvedScope` et `approvedScopeAudit` avec le même périmètre exclu que le preflight approuvé. L'audit doit confirmer qu'aucun `siteSlug` exclu n'apparaît ni dans `result.agencies`, ni dans le manifeste de rollback.

Le rollback doit être lancé via `npm run mse-25.30:network-rollback`. Avant le premier POST de restauration, le wrapper vérifie la preuve d'exclusion et recoupe le manifeste contre les pages réellement modifiées par le rollout. Toute divergence provoque `MSE_25_30_NETWORK_ROLLBACK_MANIFEST_MISMATCH` et aucune restauration n'est engagée.

La validation post-rollout doit être lancée via `npm run mse-25.30:post-rollout-validate`. Elle refuse un rapport d'apply sans preuve d'exclusion auditée, recalcule cette preuve avant les lectures publiques, puis persiste `approvedScope` et `approvedScopeAudit` dans son propre rapport final en plus des preuves Website Designer V2, métadonnées, HTML public, sitemap et indexabilité.

## Règle de promotion

Ne jamais remplacer cette SHA uniquement pour supprimer un blocage de preflight. Une nouvelle baseline peut être enregistrée seulement après une exécution CI réussie sur un commit contenant l'intégralité des modifications runtime et des tests de sécurité à promouvoir.

Si un chemin runtime protégé change après cette baseline, conserver le blocage, faire valider le nouveau HEAD par la CI, puis promouvoir explicitement ce nouveau commit dans ce document et dans la configuration opérateur.
