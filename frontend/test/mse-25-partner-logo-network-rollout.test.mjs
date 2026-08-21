import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("network logo rollout handles the full catalogue in one pass with strict official-source safeguards", () => {
  const rollout = read("scripts/partner-logo-network-rollout.mjs");
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["partners:logos:network"], "node scripts/partner-logo-network-rollout.mjs");
  assert.match(rollout, /cataloguePartners/);
  assert.match(rollout, /for \(const partner of catalogue\)/);
  assert.match(rollout, /asset-permission-review/);
  assert.match(rollout, /permission-required/);
  assert.match(rollout, /identity-review/);
  assert.match(rollout, /verification-pending/);
  assert.match(rollout, /minimumScore = Math\.max\(100/);
  assert.match(rollout, /official-page-high-confidence/);
  assert.match(rollout, /strongLogoSignal && tokenHits > 0/);
  assert.match(rollout, /unsafe-svg-active-content/);
  assert.match(rollout, /2 \* 1024 \* 1024/);
  assert.match(rollout, /\["svg", "webp"\]\.includes\(outputFormat\)/);
  assert.match(rollout, /partnerLogoResolvedSources\.json/);
  assert.match(rollout, /catalogueLineWithLogo/);
  assert.match(rollout, /backlogWithout/);
  assert.match(rollout, /projectedReady/);
  assert.match(rollout, /unresolved/);
});

test("network rollout never auto-ingests permission-held logos and manual assets are lifecycle-finalized outside the auto crawler", () => {
  const rollout = read("scripts/partner-logo-network-rollout.mjs");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");
  const catalogue = read("components/page-builder/shared/fullPartners.js");

  assert.match(backlog, /voyamar[\s\S]*state: "permission-required"/);
  for (const id of ["ponant", "celestyal-cruises", "cfc", "salaun-holidays", "nordiska", "pouchkine-tours", "belambra", "mondial-tourisme", "plein-vent", "heliades"]) {
    assert.match(catalogue, new RegExp(`P\\("${id}"[^\\n]*"\\/partners\\/manual\\/${id}\\.webp"\\)`));
    assert.doesNotMatch(backlog, new RegExp(`id:\\s*"${id}"`));
  }
  assert.match(rollout, /verification\.status === "asset-permission-review"/);
  assert.match(rollout, /backlogItem\?\.state === "permission-required"/);
  assert.match(rollout, /source\?\.status === "permission-review"/);
});
