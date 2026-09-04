import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

test("MSE-25.118g runner produces a network report and persists deduplicated history", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-118g-"));
  const currentPath = path.join(temp, "current.json");
  const historyPath = path.join(temp, "history.json");
  const outputPath = path.join(temp, "report.json");

  const current = {
    capturedAt: "2026-09-04T08:00:00.000Z",
    period: { start: "2026-08-01", end: "2026-08-31" },
    agencies: [
      {
        agencyKey: "dax",
        current: { impressions: 64, clicks: 0, position: 8.4 },
      },
    ],
    totals: { impressions: 64, clicks: 0 },
  };

  fs.writeFileSync(currentPath, JSON.stringify(current), "utf8");

  const args = [
    "scripts/mse-25-118-local-search-report.mjs",
    `--current=${currentPath}`,
    `--history=${historyPath}`,
    `--output=${outputPath}`,
  ];

  const first = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);

  const report = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  assert.equal(report.report.agencies[0].assessment.status, "visibility-no-clicks");
  assert.equal(report.automatedPublicChangeAllowed, false);
  assert.equal(report.googleWriteAllowed, false);
  assert.equal(report.historyCount, 1);

  const second = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  assert.equal(second.status, 0, second.stderr);
  const history = JSON.parse(fs.readFileSync(historyPath, "utf8"));
  assert.equal(history.length, 1);
});
