# MSE-25.30 — Baseline runtime validée

Ce document enregistre la baseline MSE-25.30 actuellement validée par GitHub Actions. Il est volontairement séparé des scripts runtime protégés afin qu'une promotion de baseline ne modifie pas elle-même la chaîne de sécurité contrôlée par le preflight.

## Baseline validée

```text
MSE_25_30_VALIDATED_BASE_SHA=a560c26174ca310a7fd41aa741eecfca112f9d11
```

Validation associée :

```text
Workflow   : MSE-25 Search Console and indexation checks
Run        : 31955547623
Event      : push
Conclusion : success
```

Cette exécution valide sous Node 22 l'ensemble des tests backend MSE-25.30, le chargement réel des modules SEO, les tests d'indexation frontend et les lints associés.

La baseline inclut notamment les durcissements éditoriaux et opératoires suivants :

- promotion d'une page publiée sans contenu visible en blocage `EMPTY_INDEXABLE_CONTENT`, tout en conservant les contenus simplement courts au niveau warning ;
- naturalisation déterministe des formulations locales et des métadonnées projetées ;
- différenciation éditoriale déterministe sur les pages `services`, `engagements` et `destinations`, sans inventer de communes ;
- exclusion réseau explicite et auditable, avec `tui-store-melun` exclu par défaut et verrouillé dans le fingerprint approuvé ;
- audit croisé des agences exclues contre les écritures réelles et le manifeste de rollback ;
- validation post-rollout des changements Website Designer V2, métadonnées, HTML public, sitemap et indexabilité ;
- audit d'intégrité du manifeste de rollback : aucune entrée ajoutée, manquante ou dupliquée n'est acceptée ;
- audit transversal du rapport d'apply : HEAD Git, fingerprint et paramètres doivent rester cohérents entre toutes les sections de preuve ;
- certification immédiate de `approvedScope`, `approvedScopeAudit` et `rolloutReportIntegrity` au moment de l'apply ;
- contrôle hors ligne `mse-25.30:rollout-report-check` avant toute opération aval ;
- attestation GitHub Actions de la baseline : le preflight exige un run `push` terminé avec `conclusion=success` sur le workflow MSE-25 et la branche attendue ;
- l'apply ré-atteste la même baseline auprès de GitHub Actions avant toute écriture et compare cette preuve à celle du preflight ;
- cette attestation est conservée dans `repository`, `preflight` et `result.preflight` ; le checker offline, le rollback et le post-rollout recalculent `baselineAttestationAudit` ;
- l'origine de l'attestation est **verrouillée sur `https://api.github.com`** dans le chemin opérateur : une variable d'environnement ne peut pas rediriger la vérification vers un serveur tiers ;
- suppression du bypass rollback legacy dans le chemin npm sécurisé : `npm run mse-25.30:network-rollback` exige obligatoirement le rapport contextuel complet issu de l'apply ;
- protection de `backend/package.json`, du module `backend/src/modules/minisite-seo-enrichment` et des scripts MSE-25.30 via `RUNTIME_PROTECTED_PATHS`.

## Utilisation sur la machine d'administration

Après synchronisation de la branche et redémarrage du backend avec le nouveau runtime :

```bash
export MSE_25_30_VALIDATED_BASE_SHA=a560c26174ca310a7fd41aa741eecfca112f9d11
npm run mse-25.30:preflight
```

Le preflight doit pouvoir joindre `https://api.github.com`. Pour limiter les risques de rate-limit, `GITHUB_TOKEN` ou `GH_TOKEN` peut être défini ; aucun token n'est requis pour un dépôt public tant que la limite anonyme GitHub n'est pas atteinte. `MSE_25_30_GITHUB_API_ORIGIN` n'est pas un paramètre opérateur supporté et ne permet pas de modifier la destination de l'attestation. Une indisponibilité de l'attestation bloque volontairement le preflight avec `MSE_25_30_PREFLIGHT_BASELINE_CI_ATTESTATION_UNAVAILABLE`.

Le HEAD peut être plus récent que cette baseline uniquement si les commits intermédiaires ne modifient aucun chemin runtime protégé. Le preflight vérifie cette propriété localement puis vérifie que la SHA de baseline possède réellement une exécution GitHub Actions réussie.

Le preview doit rendre explicites `excludedSiteSlugs` et `excludedAgencies`. Par défaut, `tui-store-melun` ne fait pas partie du plan de rollout. Tout changement du périmètre produit un nouveau fingerprint et rend un ancien rapport impropre à l'apply.

L'apply doit être lancé uniquement à partir du rapport de preflight correspondant. Avant les écritures, il ré-atteste la baseline sur GitHub et refuse une substitution de SHA ou une attestation contradictoire avec `MSE_25_30_NETWORK_ROLLOUT_BASELINE_CI_ATTESTATION_MISMATCH`.

Après un apply réussi, le rapport de rollout doit contenir `approvedScope`, `approvedScopeAudit`, `rolloutReportIntegrity` ainsi que la preuve de baseline dans `repository.validatedBaselineAttestation`, `preflight.baselineAttestation` et `result.preflight.baselineAttestation`.

Avant toute opération aval, contrôler localement le rapport :

```bash
npm run mse-25.30:rollout-report-check -- /chemin/vers/mse-25-30-rollout-....json
```

Cette commande est strictement read-only et offline. Elle vérifie `rolloutReportIntegrity`, `baselineAttestationAudit`, `approvedScopeAudit` et `rollbackManifestAudit` et doit retourner `ok: true`.

Le rollback doit être lancé uniquement via :

```bash
npm run mse-25.30:network-rollback
```

La variable `MSE_25_30_ROLLBACK_MANIFEST` doit pointer vers le **rapport de rollout contextuel complet**. Un tableau de rollback legacy ou un ancien type de rapport provoque `MSE_25_30_NETWORK_ROLLBACK_CONTEXT_REQUIRED` avant le premier POST de restauration.

La validation post-rollout via `npm run mse-25.30:post-rollout-validate` exige les mêmes garanties avant ses lectures de validation.

## Règle de promotion

Ne jamais remplacer cette SHA uniquement pour supprimer un blocage de preflight. Une nouvelle baseline peut être enregistrée seulement après une exécution CI réussie sur un commit contenant l'intégralité des modifications runtime et des tests de sécurité à promouvoir.

Si un chemin runtime protégé change après cette baseline, conserver le blocage, faire valider le nouveau HEAD par la CI, puis promouvoir explicitement ce nouveau commit dans ce document et dans la configuration opérateur.
