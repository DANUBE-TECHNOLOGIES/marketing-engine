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
  assert.match(source, /assertPartnerPagePublishable/);
  assert.match(source, /slug:\s*page\.slug/);
  assert.match(source, /status:\s*data\.status/);
  assert.match(source, /blocks:\s*restoredSections/);
  assert.ok(
    source.indexOf("assertPartnerPagePublishable") < source.indexOf("await prisma.$transaction"),
    "readiness must be checked before the rollback transaction mutates the page"
  );
});
