# MSE-25.30 — Baseline runtime validée

Ce document enregistre la baseline MSE-25.30 actuellement validée par GitHub Actions. Il est volontairement séparé des scripts runtime protégés afin qu'une promotion de baseline ne modifie pas elle-même la chaîne de sécurité contrôlée par le préflight.

## Baseline validée

```text
MSE_25_30_VALIDATED_BASE_SHA=f923297093f3e4426c33671e9536c0f87f9ad501
```

Validation associée :

```text
Workflow : MSE-25 Search Console and indexation checks
Run      : 31935366303
Event    : push
Conclusion : success
```

Cette exécution couvre notamment les tests backend `test/mse-25-30-*.test.js` sous Node 22, dont le test qui vérifie que `backend/scripts/mse-25-30-preflight.js` reste lui-même dans `RUNTIME_PROTECTED_PATHS` et qu'une dérive de ce chemin déclenche `MSE_25_30_PREFLIGHT_RUNTIME_CHANGED`.

## Utilisation sur la machine d'administration

Après avoir synchronisé la branche, utiliser cette baseline explicitement avant le préflight :

```bash
export MSE_25_30_VALIDATED_BASE_SHA=f923297093f3e4426c33671e9536c0f87f9ad501
npm run mse-25.30:preflight
```

Le HEAD peut être plus récent que cette baseline uniquement si les commits intermédiaires ne modifient aucun chemin runtime protégé. Le préflight vérifie cette propriété avant tout appel réseau de preview.

## Règle de promotion

Ne jamais remplacer cette SHA uniquement pour supprimer un blocage de préflight. Une nouvelle baseline peut être enregistrée seulement après une exécution CI réussie sur un commit contenant l'intégralité des modifications runtime et des tests de sécurité à promouvoir.

Si un chemin runtime protégé change après cette baseline, conserver le blocage, faire valider le nouveau HEAD par la CI, puis promouvoir explicitement ce nouveau commit dans ce document et dans la configuration opérateur.
