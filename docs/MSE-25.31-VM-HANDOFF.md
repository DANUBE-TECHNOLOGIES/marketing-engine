# MSE-25.31 — VM handoff

## Objet

Ce document décrit la séquence opérateur à utiliser lorsque la branche `feature/mse-25-31-local-seo-quality-uplift` est injectée sur la VM Mondescale Local Engine.

La phase initiale est strictement **read-only**. Aucun apply ne doit être lancé avant revue explicite du manifeste d'approbation.

## Invariants de sécurité

- branche attendue : `feature/mse-25-31-local-seo-quality-uplift` ;
- working tree propre ;
- définition GitHub Actions épinglée ;
- run CI `push` réussi sur le HEAD exact ;
- preview réseau `readOnly=true`, `writes=false`, `destructive=false` ;
- aucun endpoint HTTP MSE-25.31 `/apply` ;
- deux previews successifs doivent produire le même `planFingerprint` et les mêmes payloads d'exécution ;
- chaque écriture future doit être explicitement approuvée et liée à son payload exact ;
- toute divergence du HEAD, du contenu source, du fingerprint, du tenant ou du backend invalide l'apply ;
- chaque page écrite doit disposer d'un snapshot de rollback versionné.

## 1. Injection de la branche sur la VM

Depuis `/home/admin1/mondescale-local-engine` :

```bash
cd /home/admin1/mondescale-local-engine

git fetch origin

git switch feature/mse-25-31-local-seo-quality-uplift \
  || git switch -c feature/mse-25-31-local-seo-quality-uplift \
       --track origin/feature/mse-25-31-local-seo-quality-uplift

git pull --ff-only origin feature/mse-25-31-local-seo-quality-uplift

echo "=== HEAD ==="
git rev-parse HEAD

echo "=== WORKTREE ==="
git status --short
```

Le working tree doit être vide avant de continuer.

## 2. Redémarrage backend

```bash
cd /home/admin1/mondescale-local-engine

docker compose restart backend

for i in $(seq 1 30); do
  if curl -fsS \
      -H "x-tenant-slug: mondescale" \
      http://127.0.0.1:4000/minisite-seo-enrichment/health \
      >/dev/null 2>&1; then
    echo "Backend prêt"
    break
  fi

  if [ "$i" -eq 30 ]; then
    echo "ERREUR : backend indisponible"
    exit 1
  fi

  sleep 3
done
```

## 3. Gate VM readiness

```bash
cd /home/admin1/mondescale-local-engine/backend

export BACKEND_ORIGIN="http://127.0.0.1:4000"
export TENANT_SLUG="mondescale"

npm run mse-25.31:vm-readiness
```

Résultat attendu :

```text
ok: true
readyForPreflight: true
publicWritesEnabled: false
```

Cette commande vérifie notamment :

- branche et worktree ;
- blob du workflow GitHub Actions ;
- attestation CI `push` du HEAD exact ;
- présence des commandes opérateur ;
- chargement des modules MSE-25.31 ;
- présence des deux routes preview ;
- absence des routes HTTP MSE-25.31 apply ;
- preview réseau runtime strictement read-only ;
- fingerprint SHA-256 valide.

## 4. Preflight réseau réel

```bash
cd /home/admin1/mondescale-local-engine/backend

export BACKEND_ORIGIN="http://127.0.0.1:4000"
export TENANT_SLUG="mondescale"
export MINIMUM_WORDS=120

npm run mse-25.31:preflight
```

Le script écrit un rapport dans `~/mse-25-31-reports/` et exécute deux previews successifs.

Conserver le chemin renvoyé :

```bash
export MSE_25_31_PREFLIGHT_REPORT="/home/admin1/mse-25-31-reports/REMPLACER_PAR_LE_RAPPORT.json"
```

Puis vérifier le rapport hors ligne :

```bash
npm run mse-25.31:preflight-check
```

## 5. Inspection opérateur avant toute approbation

```bash
jq '{
  planFingerprint,
  repository,
  context,
  executionPayloadAudit,
  determinism,
  previewSummary: .preview.summary,
  operatorReport: .preview.operatorReport
}' "$MSE_25_31_PREFLIGHT_REPORT"
```

Contrôler en particulier :

- sites publiés / exclus ;
- warnings actuels ;
- pages candidates ;
- réduction projetée ;
- payloads complets / incomplets ;
- opérations title/meta/H1/body/maillage exactes ;
- absence de modification proposée sur un site draft ou hors périmètre.

## 6. Génération du manifeste d'approbation

Cette étape n'écrit toujours rien dans les mini-sites.

```bash
npm run mse-25.31:approval-manifest
```

Le manifeste est deny-by-default : toutes les pages commencent à `approved:false`.

Après revue humaine, seules les pages réellement validées peuvent être passées à :

```json
{
  "approved": true,
  "reviewer": "nom-ou-email-operateur",
  "reviewedAt": "2026-08-18T00:00:00.000Z",
  "note": "validation explicite"
}
```

Ne modifier aucun autre champ du candidat.

Puis :

```bash
export MSE_25_31_APPROVAL_MANIFEST="/chemin/vers/le-manifeste.json"
npm run mse-25.31:approval-check
```

## 7. Plan d'exécution et write-intent

```bash
npm run mse-25.31:execution-plan
export MSE_25_31_EXECUTION_PLAN="/chemin/vers/execution-plan.json"
npm run mse-25.31:execution-plan-check

npm run mse-25.31:write-intent
export MSE_25_31_WRITE_INTENT="/chemin/vers/write-intent.json"
npm run mse-25.31:write-intent-check
```

Le write-intent est reconstruit depuis l'état Website Designer V2 courant. Une édition manuelle intervenue depuis le preflight doit faire échouer la vérification au lieu d'être écrasée.

## 8. Dry-run obligatoire avant rollout

Récupérer les fingerprints exacts dans les fichiers validés :

```bash
export MSE_25_31_APPROVED_EXECUTION_FINGERPRINT="$(jq -r '.executionPlanFingerprint' "$MSE_25_31_EXECUTION_PLAN")"
export MSE_25_31_APPROVED_WRITE_INTENT_FINGERPRINT="$(jq -r '.writeIntentFingerprint' "$MSE_25_31_WRITE_INTENT")"
export MSE_25_31_CONFIRM=true
export MSE_25_31_DRY_RUN=true

npm run mse-25.31:network-apply
```

Le dry-run doit retourner `writes:false` et `publicWrites:false`.

## 9. Rollout réel — uniquement après validation opérateur explicite

Ne lancer cette étape qu'après inspection du dry-run et confirmation du périmètre approuvé.

```bash
export MSE_25_31_DRY_RUN=false
export CREATED_BY="mse-25.31-quality-uplift"

npm run mse-25.31:network-apply
```

Le rollout doit :

- réattester le même run CI `push` que celui enregistré au preflight ;
- revalider le plan et le write-intent ;
- créer un snapshot avant chaque page ;
- écrire via Website Designer V2 ;
- compenser automatiquement les pages déjà écrites si une page suivante échoue ;
- écrire un rapport fingerprinté avec manifeste de rollback.

## 10. Contrôles post-rollout

```bash
export MSE_25_31_ROLLOUT_REPORT="/home/admin1/mse-25-31-reports/REMPLACER_PAR_LE_RAPPORT_ROLLOUT.json"

npm run mse-25.31:rollout-report-check
npm run mse-25.31:post-rollout-validate
```

La validation post-rollout doit confirmer que la réduction réelle des warnings est au moins égale à la réduction approuvée et qu'aucun nouveau warning réseau n'est créé.

## 11. Rollback opérateur

Si une anomalie est détectée après rollout :

```bash
npm run mse-25.31:network-rollback
```

Le rollback utilise exclusivement le manifeste versionné contenu dans le rapport de rollout.

## Stop conditions

Ne jamais poursuivre vers l'apply si l'un des événements suivants survient :

- worktree sale ;
- HEAD différent du preflight ;
- CI `push` absente ou non verte ;
- workflow blob différent ;
- preview non read-only ;
- fingerprints différents ;
- payload incomplet sur une page approuvée ;
- collision de cibles d'écriture ;
- source fingerprint périmé ;
- write-intent différent de l'état runtime ;
- site draft présent dans les pages approuvées ;
- dry-run annonçant une écriture publique.
