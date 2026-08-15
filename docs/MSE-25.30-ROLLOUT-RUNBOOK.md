# MSE-25.30 — Runbook de rollout des mini-sites

Ce document décrit le passage contrôlé de MSE-25.30 depuis la branche Git vers le preview réseau réel, puis éventuellement vers l'application et le rollback.

## 1. Préconditions

- Branche attendue : `feature/mse-25-30-local-seo-optimizer`
- Working tree propre.
- Backend Local Engine démarré et joignable depuis la machine d'administration.
- Tenant par défaut : `mondescale`.
- Aucun rollout ne doit être lancé avant lecture du rapport de préflight.

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

## 4. Vérifier le backend

Par défaut les scripts opérateurs utilisent :

```text
http://127.0.0.1:4000
```

Pour une autre origine :

```bash
export BACKEND_ORIGIN=http://127.0.0.1:4000
```

Le backend déployé doit exposer :

```text
GET  /minisite-seo-enrichment/health
POST /minisite-seo-enrichment/network/content-optimize/preview
POST /minisite-seo-enrichment/network/content-optimize
```

## 5. Lancer le préflight réel

```bash
cd backend
npm run mse-25.30:preflight
```

Le préflight :

1. refuse une branche autre que `feature/mse-25-30-local-seo-optimizer` ;
2. refuse un working tree sale ;
3. enregistre le HEAD exact ;
4. vérifie la santé MSE-25.30 ;
5. lance le preview réseau sans écriture ;
6. archive un rapport JSON horodaté.

Aucune page n'est modifiée pendant cette opération.

## 6. Conditions obligatoires avant rollout

Le rapport doit satisfaire au minimum :

```text
rolloutBlocked = false
similarity.conflictCount = 0
quality.blockingCount = 0
sitemapReadiness.notReadyCount = 0
```

Les avertissements `quality.warnings` doivent être lus même s'ils ne bloquent pas automatiquement le rollout.

Le seuil de similarité réseau par défaut est de 0,78.

## 7. Appliquer MSE-25.30

Uniquement après validation du rapport de préflight :

```bash
cd backend
CONFIRM_MSE_25_30_ROLLOUT=YES npm run mse-25.30:network-apply
```

Le backend refait les garde-fous avant écriture. Un rapport de preview ancien ne permet donc pas de contourner une anomalie apparue entre-temps.

Pour chaque page modifiée :

1. un snapshot de sécurité Website Designer V2 est créé ;
2. l'optimisation MSE-25.30 est sauvegardée ;
3. une nouvelle `AgencySitePageVersion` est créée ;
4. la réponse contient un `rollbackManifest` avec l'ID exact du snapshot à restaurer.

Conserver immédiatement la sortie JSON de cette commande dans un fichier durable.

Exemple :

```bash
CONFIRM_MSE_25_30_ROLLOUT=YES npm run mse-25.30:network-apply | tee mse-25.30-rollout.json
```

## 8. Vérifications après rollout

Contrôler au minimum :

- la home de plusieurs agences ;
- une page Croisières ;
- une page Circuits ;
- une page Sur mesure ;
- une landing Destination exposée ;
- le H1 public ;
- la FAQ ;
- les liens internes ;
- le contact ;
- le sitemap public ;
- l'absence de 404 nouvelles.

Le renderer public doit toujours conserver un seul H1 lorsqu'un Hero est présent.

## 9. Rollback réseau

Extraire le tableau `rollbackManifest` de la sortie du rollout et l'enregistrer dans un fichier JSON dédié.

Puis :

```bash
cd backend
CONFIRM_MSE_25_30_ROLLBACK=YES \
MSE_25_30_ROLLBACK_MANIFEST=/chemin/rollback-manifest.json \
npm run mse-25.30:network-rollback
```

Le rollback est fail-fast : il s'arrête à la première restauration en échec et indique les restaurations déjà effectuées.

Il ne restaure que les pages explicitement présentes dans le manifeste.

## 10. Règles d'exploitation

- Ne jamais lancer `network-apply` directement sans préflight récent.
- Ne jamais modifier le seuil de similarité pour forcer un rollout sans analyser les conflits.
- Ne jamais supprimer les versions Website Designer V2 utilisées par un manifeste de rollback encore actif.
- Conserver le HEAD Git, le rapport de préflight, la sortie du rollout et le manifeste de rollback ensemble.
- Une page avec contenu manuel reste prioritaire : MSE-25.30 ne doit pas l'écraser lorsqu'un champ éditorial existe déjà.
