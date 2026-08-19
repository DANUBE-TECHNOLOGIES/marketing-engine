"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.join(__dirname, "../src/modules/agency-site/page-versions.js"),
  "utf8"
);

test("published partner rollback reuses the same readiness gate as Designer save", () => {
  const rollbackStart = source.indexOf("async function rollbackPageVersion");
  const gateCall = source.indexOf("  assertPartnerPagePublishable({", rollbackStart);
  const transaction = source.indexOf("  await prisma.$transaction", rollbackStart);

  assert.ok(rollbackStart >= 0, "rollback function must exist");
  assert.ok(gateCall > rollbackStart, "rollback must call the partner publication gate");
  assert.ok(transaction > gateCall, "readiness must be checked before the rollback transaction mutates the page");

  const guardedSource = source.slice(gateCall, transaction);
  assert.match(guardedSource, /slug:\s*page\.slug/);
  assert.match(guardedSource, /status:\s*data\.status/);
  assert.match(guardedSource, /blocks:\s*restoredSections/);
});
