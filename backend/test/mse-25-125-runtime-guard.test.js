"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("compose keeps ranking grid DataForSEO disabled by default", () => {
  const compose = read("docker-compose.yml");
  assert.match(compose, /RANKING_GRID_DATAFORSEO_ENABLED:\s*"\$\{RANKING_GRID_DATAFORSEO_ENABLED:-false\}"/);
});

test("migration helper is inspect-only by default and requires explicit apply acknowledgement", () => {
  const script = read("scripts/mse-25-125-ranking-grid-migrate.sh");
  assert.match(script, /APPLY=false/);
  assert.match(script, /--apply\) APPLY=true/);
  assert.match(script, /MSE_25_125_MIGRATION_ACK/);
  assert.match(script, /APPLY-RANKING-GRID-MIGRATION/);
  assert.match(script, /bash scripts\/backup-db\.sh/);
  assert.match(script, /prisma migrate deploy/);
  assert.match(script, /refusing migrate deploy because MSE-25\.125 is not the only pending repository migration/);
});

test("runtime helper never enables provider and gates paid run explicitly", () => {
  const script = read("scripts/mse-25-125-ranking-grid-runtime.sh");
  assert.match(script, /RUN_PAID=false/);
  assert.match(script, /MSE_25_125_PAID_ACK/);
  assert.match(script, /RUN-25-POINT-DATAFORSEO/);
  assert.match(script, /RANKING_GRID_DATAFORSEO_ENABLED/);
  assert.match(script, /script will not enable it automatically/);
  assert.doesNotMatch(script, /export RANKING_GRID_DATAFORSEO_ENABLED=true/);
  assert.doesNotMatch(script, /sed[^\n]*RANKING_GRID_DATAFORSEO_ENABLED[^\n]*true/);
});

test("runtime campaign creation is fixed to a 5x5 grid and requires explicit coordinates", () => {
  const script = read("scripts/mse-25-125-ranking-grid-runtime.sh");
  assert.match(script, /MSE_25_125_CENTER_LAT/);
  assert.match(script, /MSE_25_125_CENTER_LNG/);
  assert.match(script, /gridSize:\s*5/);
  assert.match(script, /campaign\.points\.length !== 25/);
  assert.match(script, /Number\(p\.row\) === 2 && Number\(p\.col\) === 2/);
});
