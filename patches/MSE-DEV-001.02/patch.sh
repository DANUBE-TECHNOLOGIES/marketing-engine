#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$PWD}"
cd "$ROOT"
node --check tools/mondescale/core/state.js
node --check tools/mondescale/core/runner.js
node --check tools/mondescale/commands/patch.js
node --check tools/mondescale/core/manifest.js
node --check tools/mondescale/cli.js
test -x ./mondescale
test -f tools/mondescale/commands/patch.js
test -f tools/mondescale/core/state.js
test -f tools/mondescale/core/runner.js
echo "Patch Execution Engine opérationnel."
