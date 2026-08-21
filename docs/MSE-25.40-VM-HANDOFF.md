# MSE-25.40 — Local SEO Semantic Engine — VM handoff

## Scope

MSE-25.40 is a read-only semantic optimization planner for published mini-sites. It maps intent coverage, local qualification, cannibalization, topic graph, prioritized opportunities and exact editorial proposals.

Safety invariants:

- `writes=false` and `destructive=false` on every preview;
- no `apply`, `create`, `publish` or `rollout` route;
- doorway guard enabled;
- no automatic neighboring-city expansion;
- only the persisted agency city can be used as the local scope;
- existing pages are preferred before any page creation;
- every new-page candidate requires search-demand evidence and human review;
- automatic writes remain disabled;
- draft mini-sites are excluded from the network preview.

## Worktree isolation

MSE-25.40 must run from its dedicated worktree so other developments can continue in `/home/admin1/mondescale-local-engine` without branch switching.

```bash
SEO_DIR=/home/admin1/mondescale-worktrees/mse-25-40
cd "$SEO_DIR"

git fetch origin
git pull --ff-only origin feature/mse-25-40-local-seo-semantic-engine

git branch --show-current
git status --short
git rev-parse HEAD
```

Never switch the main `/home/admin1/mondescale-local-engine` worktree to the MSE-25.40 branch.

## Dependencies and tests

```bash
cd "$SEO_DIR/backend"
npm ci
mapfile -t TESTS < <(find test -maxdepth 1 -type f -name 'mse-25-40-*.test.js' | sort)
test "${#TESTS[@]}" -gt 0
node --test "${TESTS[@]}"
```

## Runtime

The production Docker compose mount still points to `/home/admin1/mondescale-local-engine/backend`, so do not recreate that shared backend from the SEO worktree. For MSE-25.40 VM validation, run the semantic service/scripts directly from the isolated worktree or copy only after an explicit integration decision.

If the shared backend has already integrated the MSE-25.40 branch, its health endpoint is:

```bash
curl -fsS -H 'x-tenant-slug: mondescale' \
  http://127.0.0.1:4000/minisite-semantic-engine/health | jq
```

## VM readiness

```bash
cd "$SEO_DIR/backend"
BACKEND_ORIGIN=http://127.0.0.1:4000 \
TENANT_SLUG=mondescale \
npm run mse-25.40:vm-readiness
```

Expected invariants include:

- `readyForPreflight=true`;
- `publicWritesEnabled=false`;
- branch and clean-worktree checks true;
- read-only health and preview;
- doorway guard true;
- existing-page-first true;
- new-page evidence gate true;
- automatic writes disabled;
- deterministic fingerprint present.

## Network preview

```bash
cd "$SEO_DIR/backend"
BACKEND_ORIGIN=http://127.0.0.1:4000 \
TENANT_SLUG=mondescale \
npm run mse-25.40:network-preview \
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
      (.summary.highValueExistingPageCount|tostring),
      (.summary.newPageEvidenceGateCount|tostring),
      (.summary.semanticOrphanPageCount|tostring),
      (.summary.cannibalizationConflictCount|tostring)
    ]
  | @tsv
' /tmp/mse-25-40-network-preview.json | column -t -s $'\t'
```

Exact existing-page proposals:

```bash
jq -r '
  .agencies[]
  | .site.slug as $site
  | .semanticProposals.proposals[]
  | select(.type == "existing-page-semantic-uplift")
  | [
      $site,
      .pageSlug,
      .intentKey,
      (.valueScore|tostring),
      .proposed.seoTitle,
      .proposed.h1,
      .proposed.metaDescription,
      ([.proposed.internalLinks[].toPageSlug] | join(","))
    ]
  | @tsv
' /tmp/mse-25-40-network-preview.json | column -t -s $'\t'
```

New-page evidence gates:

```bash
jq -r '
  .agencies[]
  | .site.slug as $site
  | .semanticProposals.proposals[]
  | select(.type == "new-page-evidence-gate")
  | [$site,.intentKey,.suggestedTitle,(.requiresSearchDemandEvidence|tostring),(.requiresHumanReview|tostring)]
  | @tsv
' /tmp/mse-25-40-network-preview.json | column -t -s $'\t'
```

## Deterministic preflight

```bash
cd "$SEO_DIR/backend"
export BACKEND_ORIGIN=http://127.0.0.1:4000
export TENANT_SLUG=mondescale
export MSE_25_40_REPORT_DIR=/home/admin1/mse-25-40-reports

npm run mse-25.40:preflight
```

The preflight runs the full network preview twice and refuses non-determinism, a dirty worktree, another branch, disabled doorway protection, automatic writes, missing existing-page preference or a disabled new-page evidence gate.

## Sealed opportunity manifest

```bash
PREFLIGHT="$(ls -1t /home/admin1/mse-25-40-reports/mse-25-40-preflight-*.json | head -1)"
export MSE_25_40_PREFLIGHT_REPORT="$PREFLIGHT"
npm run mse-25.40:opportunity-manifest
```

The manifest separates:

- high-value existing-page semantic uplifts;
- lower-value existing-page reviews;
- new-page candidates requiring search-demand evidence;
- cannibalization advisories.

No entry in this manifest is automatically writable.

## Stop condition

After the opportunity manifest, stop. Use the real network results to select which existing-page proposals should become a versioned execution layer. New page candidates remain blocked until Search Console/search-demand evidence exists.
