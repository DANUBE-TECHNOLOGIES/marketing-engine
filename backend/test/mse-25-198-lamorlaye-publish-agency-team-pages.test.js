"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../scripts/mse-25-198-lamorlaye-publish-agency-team-pages.js"), "utf8");

test("MSE-25.198 targets Lamorlaye and existing agency/team pages only", () => {
  assert.match(source, /mondescale-lamorlaye/);
  assert.match(source, /aliases: \["agence", "notre-agence", "qui-sommes-nous"\]/);
  assert.match(source, /aliases: \["equipe", "équipe", "team", "notre-equipe"\]/);
  assert.match(source, /page existante introuvable/);
  assert.doesNotMatch(source, /agencySitePage\.create/);
});

test("MSE-25.198 changes publication state without changing route topology", () => {
  assert.match(source, /data\.status = "published"/);
  assert.match(source, /data\.published = true/);
  assert.match(source, /data\.isPublished = true/);
  assert.match(source, /topologyFingerprint/);
  assert.match(source, /topologyUnchanged: true/);
  assert.match(source, /untouchedContentUnchanged: true/);
  assert.match(source, /routeCreation: 0/);
  assert.match(source, /networkWrites: 0/);
});

test("MSE-25.198 is dry-run by default and has guarded rollback", () => {
  assert.match(source, /MSE_25_198_CONFIRM/);
  assert.match(source, /MSE_25_198_ROLLBACK/);
  assert.match(source, /mode: "DRY_RUN"/);
  assert.match(source, /fs\.writeFileSync\(SNAPSHOT_PATH/);
  assert.match(source, /await rollback\(site\)/);
});
