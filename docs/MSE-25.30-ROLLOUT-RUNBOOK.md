# MSE-25.30 — Runbook de rollout des mini-sites

Ce document décrit la chaîne opérateur complète de MSE-25.30 : synchronisation, préflight read-only, application confirmée, validation post-rollout read-only et rollback contextualisé.

## 1. Préconditions

- Branche attendue : `feature/mse-25-30-local-seo-optimizer`
- Working tree propre.
- Backend Local Engine démarré et joignable depuis la machine d'administration.
- Tenant par défaut : `mondescale`.
- Aucun rollout ne doit être lancé sans rapport de préflight récent et validé.
- Ne pas modifier les chemins runtime MSE-25.30 après la baseline CI validée sans refaire la validation CI.

## 2. Synchroniser la branche sur le serveur

Depuis la racine du repository :

```bash
git fetch origin
git switch feature/mse-25-30-local-seo-optimizer
git pull --ff-only origin feature/mse-25-30-local-seo-optimizer
git status --short
git rev-parse HEAD
```

Le `git status --short` doit être vide.

## 3. Installer les dépendances backend

```bash
cd backend
npm ci
```

Aucune migration Prisma n'est requise uniquement pour MSE-25.30 tant qu'aucune migration nouvelle n'est présente dans la branche déployée.

## 4. Configurer le backend ciblé

Par défaut les scripts opérateurs utilisent :

```text
http://127.0.0.1:4000
```

Pour une autre origine :

```bash
export BACKEND_ORIGIN=http://127.0.0.1:4000
export TENANT_SLUG=mondescale
```

Le backend doit exposer les capacités MSE-25.30 attendues par le health check : persistance, écritures versionnées, garde de similarité, quality gate, sitemap readiness, snapshots de rollback, compensation automatique, protection des pages `noindex` et protection des routes canoniques rendues hors Website Designer V2.

Les deux protections d'écriture suivantes sont obligatoires :

```text
noindexContentWriteGuard = true
managedRouteContentWriteGuard = true
```

Elles garantissent notamment que les pages légales volontairement `noindex` et les pages V2 dont la route canonique est gérée par un renderer dédié ne sont ni chargées ni écrites inutilement par le rollout de contenu.

## 5. Lancer le préflight réel — aucune écriture

```bash
cd backend
npm run mse-25.30:preflight
```

Le préflight :

1. refuse une branche inattendue ;
2. refuse un working tree sale ;
3. vérifie que la baseline CI validée est bien dans l'historique courant ;
4. refuse toute dérive des chemins runtime protégés depuis cette baseline ;
5. vérifie les capacités annoncées par `/minisite-seo-enrichment/health` ;
6. lance le preview réseau sans écriture ;
7. archive un rapport JSON horodaté, par défaut sous `~/mse-25-30-reports/`.

La sortie contient le chemin exact `reportPath`. Le conserver : l'apply exigera ce même fichier.

## 6. Conditions obligatoires avant rollout

Le rapport doit notamment indiquer :

```text
rolloutBlocked = false
similarity.blockingConflictCount = 0
quality.blockingCount = 0
sitemapReadiness.notReadyCount = 0
```

Les avertissements non bloquants doivent malgré tout être lus. Le seuil de similarité réseau par défaut est de `0.78`.

Pour chaque agence, examiner également :

- `changedPages` : pages qui recevront réellement des modifications ;
- `excludedPages` : pages volontairement sorties du rollout de contenu ;
- `pagesExcludedNoindex` : nombre de pages exclues car elles sont volontairement non indexables ;
- `pagesExcludedManagedRoute` : nombre de pages exclues car leur route canonique est rendue par un composant dédié et non par leur contenu Website Designer V2.

Chaque entrée de `excludedPages` expose uniquement les informations utiles à l'opérateur :

```json
{
  "slug": "mentions-legales",
  "title": "Mentions légales",
  "reason": "noindex-page"
}
```

ou, pour une route publique gérée séparément :

```json
{
  "slug": "inspiration",
  "title": "Inspirations",
  "reason": "canonical-route-managed"
}
```

Une exclusion connue n'est pas une anomalie. En revanche, une page commerciale ou éditoriale attendue qui disparaîtrait de `changedPages` sans apparaître dans `excludedPages` doit être examinée avant tout apply.

Le rapport de préflight expire au bout de 30 minutes par défaut. L'apply exige également le même tenant, le même backend et le même HEAD Git que le préflight.

## 7. Appliquer MSE-25.30

Récupérer d'abord le chemin exact affiché par le préflight :

```bash
export MSE_25_30_PREFLIGHT_REPORT=/chemin/vers/mse-25-30-network-preview-....json
```

Puis seulement après validation humaine du rapport :

```bash
CONFIRM_MSE_25_30_ROLLOUT=YES npm run mse-25.30:network-apply
```

Pour chaque page réellement modifiée, le backend :

1. crée un snapshot Website Designer V2 ;
2. refuse l'écriture si l'identifiant exact du snapshot de rollback n'est pas résolu ;
3. sauvegarde le contenu optimisé dans une nouvelle version ;
4. conserve les valeurs attendues des changements (`expectedChanges`) ;
5. ajoute l'entrée correspondante au manifeste de rollback.

Les pages listées dans `excludedPages` restent également associées au résultat de l'agence afin que l'opérateur puisse vérifier qu'elles n'ont pas été transformées silencieusement en écritures.

Si une écriture suivante échoue, les pages déjà appliquées sont automatiquement compensées en ordre inverse à partir de leurs snapshots. Une compensation partielle est remontée explicitement comme erreur.

Après un rollout réussi, le script crée automatiquement un rapport contextualisé horodaté sous `~/mse-25-30-reports/`. Sa sortie contient `rolloutReportPath`. Ce rapport lie ensemble le HEAD, le tenant, le backend, le préflight, les versions appliquées, les changements attendus et le manifeste de rollback.

Si le serveur a appliqué le rollout mais que l'écriture locale du rapport échoue, le résultat reste explicitement `ok: true` pour l'application serveur, avec `operatorAttentionRequired: true`, le manifeste restant dans la sortie et un code de sortie opérateur non nul. Ne jamais relancer aveuglément l'apply dans ce cas.

## 8. Validation post-rollout — strictement read-only

Dès que l'apply a produit son rapport :

```bash
export MSE_25_30_ROLLOUT_REPORT=/chemin/vers/mse-25-30-network-rollout-....json
npm run mse-25.30:post-rollout-validate
```

Le validateur refuse toute méthode autre que `GET`. Il ne peut donc pas modifier le contenu.

Pour chaque page modifiée il vérifie d'abord la persistance Website Designer V2 via le GET `/agencies/:agencyId/site/pages/:pageSlug/blocks`, puis applique le contrôle correspondant à son état :

- `indexable` : les changements attendus sont présents dans V2 et dans le contrat public, la page est dans le sitemap, l'HTML canonique répond, le `<h1>` attendu est réellement rendu, l'introduction Hero attendue est rendue lorsqu'elle a été modifiée, le canonical est cohérent et aucun `noindex` n'est présent ;
- `noindex` : les changements V2 sont présents, la page reste explicitement exclue du sitemap avec la raison `noindex-page`, reste publique et son HTML conserve `noindex` ;
- `unpublished` : les changements V2 sont présents, la page reste en draft/non publiée et n'apparaît pas dans le contrat public ;
- tout état sitemap incohérent devient `invalid-sitemap-state` et fait échouer la validation.

Les pages exclues en amont par les gardes d'écriture ne font pas partie des pages modifiées à valider : leur présence explicite dans `excludedPages` constitue la trace opérateur justifiant leur absence du diff.

Le validateur exige aussi que chaque mini-site reste `readyToSubmit = true`. Il archive à son tour un rapport JSON horodaté.

Un rollout ne doit être considéré comme terminé que si cette validation retourne `ok: true`.

## 9. Rollback réseau

Le rollback utilise directement le rapport contextualisé généré par l'apply ; il n'est plus nécessaire d'extraire manuellement un tableau de versions.

```bash
cd backend
CONFIRM_MSE_25_30_ROLLBACK=YES \
MSE_25_30_ROLLBACK_MANIFEST=/chemin/vers/mse-25-30-network-rollout-....json \
npm run mse-25.30:network-rollback
```

Avant restauration, le script vérifie que le tenant et le backend correspondent à ceux du rollout. Les restaurations sont exécutées en ordre inverse. Le rollback est fail-fast : il s'arrête à la première restauration en échec et indique précisément ce qui a déjà été restauré.

Les anciens manifestes non contextualisés sont refusés par défaut. Leur usage nécessite volontairement `MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST=YES` et ne doit être réservé qu'à un cas de récupération exceptionnel.

Après un rollback, refaire les contrôles publics et d'indexation appropriés avant toute nouvelle tentative de rollout.

## 10. Règles d'exploitation

- Ne jamais lancer `network-apply` sans préflight récent.
- Ne jamais réutiliser un préflight d'un autre HEAD, tenant ou backend.
- Lire les pages exclues et leur raison au même titre que les pages modifiées.
- Ne jamais abaisser le seuil de similarité pour forcer un rollout sans analyse.
- Ne jamais supprimer les versions Website Designer V2 référencées par un rapport de rollout encore actif.
- Conserver ensemble le HEAD Git, le rapport de préflight, le rapport de rollout, le rapport post-rollout et, en cas d'incident, la sortie du rollback.
- Ne jamais considérer l'écriture backend comme seule preuve de réussite : la validation post-rollout doit également confirmer le contrat public, l'HTML réellement rendu et l'indexabilité attendue.
- Une introduction ou un contenu manuel existant reste prioritaire : MSE-25.30 ne doit pas l'écraser lorsqu'il est conçu pour préserver ce champ.
