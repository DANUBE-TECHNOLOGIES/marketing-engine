# MSE-25.40 — Local SEO Semantic Engine — VM handoff

## Scope

MSE-25.40 is deliberately read-only. It maps the real semantic coverage of published mini-sites and never creates, publishes or modifies a page.

Safety invariants:

- `writes=false` and `destructive=false` on every preview;
- no `apply`, `create`, `publish` or `rollout` route;
- doorway guard enabled;
- no automatic neighboring-city expansion;
- only the persisted agency city can be used as the local scope;
- page candidates always require human review;
- draft mini-sites are excluded from the network preview.

## VM injection

```bash
cd /home/admin1/mondescale-local-engine

git fetch origin
git switch feature/mse-25-40-local-seo-semantic-engine \
  || git switch -c feature/mse-25-40-local-seo-semantic-engine \
       --track origin/feature/mse-25-40-local-seo-semantic-engine

git pull --ff-only origin feature/mse-25-40-local-seo-semantic-engine

git status --short
git rev-parse HEAD

cd backend
node --test test/mse-25-40-*.test.js

cd ..
docker compose restart backend
```

Wait for the runtime:

```bash
for i in $(seq 1 30); do
  if curl -fsS -H 'x-tenant-slug: mondescale' \
    http://127.0.0.1:4000/minisite-semantic-engine/health >/dev/null 2>&1; then
    echo 'MSE-25.40 backend ready'
    break
  fi
  sleep 2
done
```

## Runtime readiness

```bash
cd /home/admin1/mondescale-local-engine/backend
BACKEND_ORIGIN=http://127.0.0.1:4000 \
TENANT_SLUG=mondescale \
node scripts/mse-25-40-vm-readiness.js
```

Expected invariants:

- `readyForPreflight=true`;
- `publicWritesEnabled=false`;
- `checks.branch=true`;
- `checks.cleanWorktree=true`;
- `checks.healthReadOnly=true`;
- `checks.doorwayGuard=true`;
- `checks.previewReadOnly=true`;
- `checks.fingerprint=true`.

## Network preview

```bash
BACKEND_ORIGIN=http://127.0.0.1:4000 \
TENANT_SLUG=mondescale \
node scripts/mse-25-40-network-preview.js \
  | tee /tmp/mse-25-40-network-preview.json
```

Useful summary:

```bash
jq '{planFingerprint,summary,excludedSites,policy}' /tmp/mse-25-40-network-preview.json
```

Agency matrix:

```bash
jq -r '
  .agencies[]
  | [
      .site.slug,
      .site.city,
      (.summary.strongIntentCount|tostring),
      (.summary.coveredIntentCount|tostring),
      (.summary.semanticGapCount|tostring),
      (.summary.commercialGapCount|tostring),
      (.summary.localQualificationGapCount|tostring),
      (.summary.cannibalizationConflictCount|tostring)
    ]
  | @tsv
' /tmp/mse-25-40-network-preview.json | column -t -s $'\t'
```

Commercial gaps:

```bash
jq -r '
  .agencies[]
  | .site.slug as $site
  | .site.city as $city
  | .coverage[]
  | select(.commercial == true and .status != "strong")
  | [$site,$city,.intentKey,.status,(.gapReason // "-"),(.bestPageSlug // "-"),(.bestScore|tostring),(.bestLocalityScore|tostring)]
  | @tsv
' /tmp/mse-25-40-network-preview.json | column -t -s $'\t'
```

Cannibalization advisories:

```bash
jq -r '
  .agencies[]
  | .site.slug as $site
  | .cannibalization[]
  | [$site,.intentKey,.severity,([.pages[].slug]|join(","))]
  | @tsv
' /tmp/mse-25-40-network-preview.json | column -t -s $'\t'
```

## Deterministic preflight

```bash
BACKEND_ORIGIN=http://127.0.0.1:4000 \
TENANT_SLUG=mondescale \
node scripts/mse-25-40-preflight.js
```

The preflight runs the full network preview twice and refuses a different fingerprint, a dirty worktree, another branch or a disabled anti-doorway policy.

## Stop condition

MSE-25.40 has no write path. After the preflight, stop and review the semantic matrix before designing any execution layer.
