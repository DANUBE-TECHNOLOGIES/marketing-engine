"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("MSE-25.8 registers agency-launch routes in the backend runtime", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/modules/register-modules.js"),
    "utf8"
  );

  assert.match(
    source,
    /const\s+agencyLaunch\s*=\s*require\(["']\.\/agency-launch["']\)/
  );

  assert.match(
    source,
    /app\.use\(agencyLaunch\.createAgencyLaunchRouter\(\{\s*prisma\s*\}\)\)/
  );
});
