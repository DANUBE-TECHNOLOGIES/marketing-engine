#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$PWD}"
cd "$ROOT"

node --check \
  tools/mondescale/prisma/parser.js

node --check \
  tools/mondescale/prisma/audit.js

node --check \
  tools/mondescale/prisma/report.js

node --check \
  tools/mondescale/commands/prisma.js

node --check \
  tools/mondescale/cli.js

./mondescale prisma audit
