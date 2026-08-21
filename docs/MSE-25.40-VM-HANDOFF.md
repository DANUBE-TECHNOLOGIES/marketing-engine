# MSE-25.40 — Local SEO Semantic Engine — VM handoff

## Scope

MSE-25.40 is a read-only semantic optimization planner for published mini-sites. It maps intent coverage, local qualification, cannibalization, topic graph, prioritized opportunities and exact editorial proposals.

Safety invariants:

- `writes=false` and `destructive=false` on every preview;
- no `apply`, `create`, `publish` or `rollout` route;
- doorway guard enabled;
- no automatic neighboring-city expansion;
- strict tenant scope;
- only the persisted agency city can be used as the local scope;
- existing pages are preferred before any page creation;
- every new-page candidate requires search-demand evidence and human review;
- automatic writes remain disabled;
- draft mini-sites are excluded from the network preview.

## Worktree isolation

MSE-25.40 runs from its dedicated worktree:

```bash
SEO_DIR=/home/admin1/mondescale-worktrees/mse-25-40
cd "$SEO_DIR"

git fetch origin
git pull --ff-only origin feature/mse-25-40-local-seo-semantic-engine

git branch --show-current
git status --short
git rev-parse HEAD
```

Never switch `/home/admin1/mondescale-local-engine` to MSE-25.40. That main worktree remains available for the partner and other development streams.

## Shared environment, isolated code

The semantic worktree reads the same PostgreSQL database but does not restart or modify the shared backend runtime.

```bash
export MSE_25_40_ENV_FILE=/home/admin1/mondescale-local-engine/backend/.env
export MSE_25_40_PREVIEW_MODE=direct
export TENANT_SLUG=mondescale
export MSE_25_40_REPORT_DIR=/home/admin1/mse-25-40-reports
```

`MSE_25_40_PREVIEW_MODE=direct` instantiates Prisma and the semantic service locally from the isolated worktree. No Docker restart and no branch switch in the main worktree are required.

## Dependencies and tests

```bash
cd "$SEO_DIR/backend"
npm ci
mapfile -t TESTS < <(find test -maxdepth 1 -type f -name 'mse-25-40-*.test.js' | sort)
test "${#TESTS[@]}" -gt 0
printf '%s\n' "${TESTS[@]}"
node --test "${TESTS[@]}"
```

## Direct VM readiness

```bash
cd "$SEO_DIR/backend"
npm run mse-25.40:vm-readiness
```

Expected invariants:

- `readyForPreflight=true`;
- `publicWritesEnabled=false`;
- `runtime.mode=direct`;
- branch and clean-worktree checks true;
- tenant scope true;
- read-only health and preview;
- doorway guard true;
- existing-page-first true;
- new-page evidence gate true;
- automatic writes disabled;
- deterministic fingerprint present.

## Network preview

```bash
cd "$SEO_DIR/backend"
npm run mse-25.40:network-preview \
  | tee /tmp/mse-25-40-network-preview.json
```

Useful summary:

```bash
jq '{tenantSlug,planFingerprint,summary,excludedSites,policy}' /tmp/mse-25-40-network-preview.json
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
cd "$SEO_DIR/backend"
npm run mse-25.40:preflight
```

The preflight runs the full direct network preview twice and refuses non-determinism, a dirty worktree, another branch, disabled doorway protection, automatic writes, missing existing-page preference or a disabled new-page evidence gate.

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

After the opportunity manifest, stop. The next development layer can convert selected existing-page proposals into a versioned execution plan. New page candidates remain blocked until Search Console/search-demand evidence exists.
