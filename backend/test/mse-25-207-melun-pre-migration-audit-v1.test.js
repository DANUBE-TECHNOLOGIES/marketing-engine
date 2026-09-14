"use strict";

const fs = require("fs");
const path = require("path");
const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

describe("MSE-25.207 — Melun pre-migration audit V1", () => {
  const scriptPath = path.join(
    __dirname,
    "..",
    "scripts",
    "mse-25-207-melun-pre-migration-audit-v1.js"
  );
  const source = fs.readFileSync(scriptPath, "utf8");

  test("targets only the current Melun slug by default", () => {
    assert.ok(source.includes('"tui-store-melun"'));
    assert.ok(source.includes('normalize(site.agency?.city) !== "melun"'));
  });

  test("records but does not activate the future slug", () => {
    assert.ok(source.includes('futureSlug: "ambassade-fram-mondescale-melun"'));
    assert.ok(source.includes('mode: "READ_ONLY"'));
    assert.ok(source.includes("mutationPerformed: false"));
  });

  test("contains no Prisma write operation", () => {
    assert.doesNotMatch(source, /prisma\.[a-zA-Z0-9_]+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/);
    assert.doesNotMatch(source, /tx\.[a-zA-Z0-9_]+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(/);
  });

  test("guards against premature Ambassade FRAM publication", () => {
    assert.ok(source.includes('"ambassade fram"'));
    assert.ok(source.includes("noPrematureAmbassadeFramContent"));
  });
});
