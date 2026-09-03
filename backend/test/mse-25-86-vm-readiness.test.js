"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  readinessBlockers,
  previewReports,
  findCreatedPreview,
} = require("../scripts/mse-25-86-vm-readiness");

test("VM readiness has no blockers when every gate is true", () => {
  const checks = {
    expectedBranch: true,
    cleanWorktree: true,
    databaseUrlAvailable: true,
    databaseConnected: true,
    tenantFound: true,
    previewReadOnly: true,
    nineSites: true,
    projectedCoverageGate: true,
    noFrontendSurface: true,
    noStructuralMutation: true,
    previewReportPersisted: true,
  };
  assert.deepEqual(readinessBlockers(checks), []);
});

test("VM readiness explains every failed gate", () => {
  const blockers = readinessBlockers({
    expectedBranch: false,
    cleanWorktree: true,
    databaseUrlAvailable: false,
    projectedCoverageGate: false,
  });
  assert.deepEqual(blockers.map((item) => item.check), [
    "expectedBranch",
    "databaseUrlAvailable",
    "projectedCoverageGate",
  ]);
  assert.ok(blockers.every((item) => typeof item.message === "string" && item.message.length > 0));
});

test("VM readiness identifies the preview report created by the current run", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-86-readiness-"));
  try {
    const oldFile = path.join(dir, "mse-25-86-preview-old.json");
    fs.writeFileSync(oldFile, "{}\n", "utf8");
    const before = previewReports(dir);
    assert.equal(before.has(oldFile), true);

    const newFile = path.join(dir, "mse-25-86-preview-new.json");
    fs.writeFileSync(newFile, "{}\n", "utf8");
    const detected = findCreatedPreview(dir, before);
    assert.equal(detected, newFile);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
