import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("partner readiness separates content readiness from logo completeness", () => {
  const profile = read("components/page-builder/shared/partnerProfile.js");
  const report = read("scripts/partner-publication-readiness.mjs");

  assert.match(profile, /identity:\s*30/);
  assert.match(profile, /summary:\s*20/);
  assert.match(profile, /tags:\s*10/);
  assert.match(profile, /details:\s*25/);
  assert.match(profile, /logo:\s*15/);
  assert.match(profile, /contentReady/);
  assert.match(profile, /assetReady/);
  assert.match(profile, /readyForPublication/);
  assert.match(profile, /getPartnerCompletenessSummary/);

  assert.match(report, /content-first-logo-fallback-allowed/);
  assert.match(report, /ready-with-logo-fallback/);
  assert.match(report, /needs-content/);
  assert.match(report, /--strict-content=true/);
  assert.match(report, /identity-review/);
  assert.match(report, /blockers/);
  assert.match(report, /process\.exitCode = 2/);
});
