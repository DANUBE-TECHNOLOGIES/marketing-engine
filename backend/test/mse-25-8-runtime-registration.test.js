"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function runtimeSource() {
  return fs.readFileSync(
    path.join(__dirname, "../src/modules/register-modules.js"),
    "utf8"
  );
}

test("MSE-25.8 registers agency-launch routes in the backend runtime", () => {
  const source = runtimeSource();

  assert.match(
    source,
    /const\s+agencyLaunch\s*=\s*require\(["']\.\/agency-launch["']\)/
  );

  assert.match(
    source,
    /app\.use\(agencyLaunch\.createAgencyLaunchRouter\(\{\s*prisma\s*\}\)\)/
  );
});

test("MSE-25.8 registers site-publication routes in the backend runtime", () => {
  const source = runtimeSource();

  assert.match(
    source,
    /const\s+sitePublication\s*=\s*require\(["']\.\/site-publication["']\)/
  );

  assert.match(
    source,
    /app\.use\(sitePublication\.createSitePublicationRoutes\(prisma\)\)/
  );
});
