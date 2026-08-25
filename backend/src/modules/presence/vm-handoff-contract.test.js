"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const script = fs.readFileSync(path.resolve(__dirname, "../../../scripts/presence-vm-handoff.js"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../package.json"), "utf8"));

test("VM handoff refuses Google writes and reports zero external writes", () => {
  assert.match(script, /PRESENCE_GOOGLE_WRITES_ENABLED/);
  assert.match(script, /Préflight refusé/);
  assert.match(script, /externalWritesPerformed:\s*false/);
  assert.match(script, /safeReadOnlyMode/);
});

test("VM handoff freezes only an already-ready read-only preflight", () => {
  assert.match(script, /--freeze/);
  assert.match(script, /readyForReadOnlyPreflight/);
  assert.match(script, /freezeDeploymentPreflight/);
  assert.match(script, /PREFLIGHT_NOT_READY/);
});

test("package exposes separate preview and freeze handoff commands", () => {
  assert.equal(packageJson.scripts["presence:vm-handoff"], "node scripts/presence-vm-handoff.js");
  assert.equal(packageJson.scripts["presence:vm-handoff:freeze"], "node scripts/presence-vm-handoff.js --freeze");
});
