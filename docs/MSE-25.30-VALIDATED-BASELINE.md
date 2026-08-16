# MSE-25.30 — Baseline runtime validée

Ce document enregistre la baseline MSE-25.30 actuellement validée par GitHub Actions. Il est volontairement séparé des scripts runtime protégés afin qu'une promotion de baseline ne modifie pas elle-même la chaîne de sécurité contrôlée par le préflight.

## Baseline validée

```text
MSE_25_30_VALIDATED_BASE_SHA=c2b3d65e51aeeacfce54b2f4e3d482beb0a193ed
```

Validation associée :

```text
Workflow   : MSE-25 Search Console and indexation checks
Run        : 31946871177
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
- exigence des capacités de durcissement dans le health check du preflight.

Le répertoire complet `backend/src/modules/minisite-seo-enrichment` ainsi que les scripts de rollout MSE-25.30 restent protégés par `RUNTIME_PROTECTED_PATHS`. Toute dérive de ces chemins après cette baseline doit provoquer `MSE_25_30_PREFLIGHT_RUNTIME_CHANGED`.

## Utilisation sur la machine d'administration

Après avoir synchronisé la branche et redémarré le backend avec le nouveau runtime, utiliser cette baseline explicitement avant le preflight :

```bash
export MSE_25_30_VALIDATED_BASE_SHA=c2b3d65e51aeeacfce54b2f4e3d482beb0a193ed
npm run mse-25.30:preflight
```

Le HEAD peut être plus récent que cette baseline uniquement si les commits intermédiaires ne modifient aucun chemin runtime protégé. Le preflight vérifie cette propriété avant tout appel réseau de preview.

Le preview doit rendre explicites `excludedSiteSlugs` et `excludedAgencies`. Par défaut, `tui-store-melun` ne fait donc pas partie du plan de rollout. Pour modifier volontairement ce périmètre, définir `MSE_25_30_EXCLUDED_SITE_SLUGS` avant de relancer le preflight ; tout changement du plan produit un nouveau fingerprint et rend un ancien rapport impropre à l'apply.

Après un apply réussi, le rapport de rollout doit également contenir `approvedScope` avec le même périmètre exclu que le preflight approuvé. La validation post-rollout doit être lancée via `npm run mse-25.30:post-rollout-validate`, qui utilise le validateur renforcé des métadonnées de page.

## Règle de promotion

Ne jamais remplacer cette SHA uniquement pour supprimer un blocage de preflight. Une nouvelle baseline peut être enregistrée seulement après une exécution CI réussie sur un commit contenant l'intégralité des modifications runtime et des tests de sécurité à promouvoir.

Si un chemin runtime protégé change après cette baseline, conserver le blocage, faire valider le nouveau HEAD par la CI, puis promouvoir explicitement ce nouveau commit dans ce document et dans la configuration opérateur.
