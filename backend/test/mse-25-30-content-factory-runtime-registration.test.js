"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("content factory routes are mounted by register-modules", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/modules/register-modules.js"),
    "utf8"
  );

  assert.match(source, /const contentFactory = require\("\.\/content-factory"\);/);
  assert.match(source, /if\s*\(\s*contentFactory\.routes\s*\)/);
  assert.match(source, /app\.use\(\s*contentFactory\.routes\(\{\s*prisma\s*\}\)\s*\)/);
});
