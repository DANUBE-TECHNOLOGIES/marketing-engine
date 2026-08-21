# MSE-25.40 — Local SEO Semantic Engine — VM handoff

## Scope

MSE-25.40 is a read-only semantic optimization planner for published mini-sites. It maps intent coverage, local qualification, canonical managed commercial routes, cannibalization, topic graph, prioritized opportunities and exact editorial proposals.

Safety invariants:

- `writes=false` and `destructive=false` on every preview;
- no `apply`, `create`, `publish` or `rollout` route;
- doorway guard enabled;
- no automatic neighboring-city expansion;
- strict tenant scope;
- canonical managed routes participate in semantic coverage but are never written through Website Designer;
- only the persisted agency city can be used as the local scope;
- existing canonical pages are preferred before any page creation;
- every new-page candidate requires search-demand evidence and human review;
- automatic writes remain disabled;
- draft mini-sites are excluded from the network preview;
- one URL can have only one primary Title/H1 identity; secondary intents are consolidated as sections.

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

Never switch `/home/admin1/mondescale-local-engine` to MSE-25.40. The main worktree remains available for partner and other development streams.

## Shared environment, isolated code

```bash
export MSE_25_40_ENV_FILE=/home/admin1/mondescale-local-engine/backend/.env
export MSE_25_40_PREVIEW_MODE=direct
export TENANT_SLUG=mondescale
export MSE_25_40_REPORT_DIR=/home/admin1/mse-25-40-reports
```

The isolated worktree reads PostgreSQL directly. Do not restart the shared backend for MSE-25.40 validation.

## Tests

```bash
cd "$SEO_DIR/backend"
npm ci
mapfile -t TESTS < <(find test -maxdepth 1 -type f -name 'mse-25-40-*.test.js' | sort)
test "${#TESTS[@]}" -gt 0
node --test "${TESTS[@]}"
```

## Direct VM readiness

```bash
npm run mse-25.40:vm-readiness
```

Expected gates include tenant scoping, read-only mode, doorway protection, `managedRoutesAware=true`, existing-page preference, new-page evidence gate, zero automatic writes and a deterministic fingerprint.

## Network preview

```bash
npm run --silent mse-25.40:network-preview | tee /tmp/mse-25-40-network-preview.json
jq empty /tmp/mse-25-40-network-preview.json
jq '{tenantSlug,planFingerprint,summary,excludedSites,policy}' /tmp/mse-25-40-network-preview.json
```

Managed routes must now appear in `publishedPageCount` / `managedRoutePageCount`. Commercial intents such as cruises, circuits, stays, tailor-made and ticketing should resolve to their canonical managed routes when those routes are published and locally qualified.

Managed-route reviews are visible but never writable:

```bash
jq -r '
  .agencies[] | .site.slug as $site |
  .semanticProposals.proposals[] |
  select(.type == "managed-route-semantic-review") |
  [$site,.pageSlug,.intentKey,(.valueScore|tostring),.reason] | @tsv
' /tmp/mse-25-40-network-preview.json | column -t -s $'\t'
```

## Deterministic preflight

```bash
npm run mse-25.40:preflight
PREFLIGHT="$(ls -1t /home/admin1/mse-25-40-reports/mse-25-40-preflight-*.json | head -1)"
export MSE_25_40_PREFLIGHT_REPORT="$PREFLIGHT"
```

The preflight refuses a preview that does not certify managed-route awareness.

## Sealed opportunity manifest

```bash
npm run mse-25.40:opportunity-manifest
```

The manifest separates writable Website Designer opportunities, managed-route reviews, new-page evidence gates and cannibalization advisories.

## Consolidated page execution preview

Never execute individual intent proposals directly. Several intents can point to the same page, especially `home` and `services`. Generate the consolidated plan:

```bash
npm run mse-25.40:consolidated-plan
CONSOLIDATED="$(ls -1t /home/admin1/mse-25-40-reports/mse-25-40-consolidated-*.json | head -1)"
jq '{executionFingerprint,sourcePlanFingerprint,summary,policy}' "$CONSOLIDATED"
```

For each writable URL the consolidated plan enforces:

- one Title;
- one H1;
- preservation of an already-strong primary intent;
- secondary intents represented by H2/editorial sections and contextual links;
- preservation of manual body copy;
- zero automatic writes.

## Stop condition

Stop after the consolidated plan. Use the real managed-route-aware results to decide whether a versioned Website Designer write layer is still needed. Canonical managed routes require their own renderer/metadata integration path and must never be modified through the generic Website Designer executor.
