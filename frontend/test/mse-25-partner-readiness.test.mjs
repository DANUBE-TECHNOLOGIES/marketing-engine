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
  const audit = read("scripts/partner-catalog-quality.mjs");

  assert.match(profile, /identity:\s*30/);
  assert.match(profile, /summary:\s*20/);
  assert.match(profile, /tags:\s*10/);
  assert.match(profile, /details:\s*25/);
  assert.match(profile, /logo:\s*15/);
  assert.match(profile, /contentReady/);
  assert.match(profile, /assetReady/);
  assert.match(profile, /readyForPublication/);
  assert.match(profile, /identityConfirmed/);
  assert.match(profile, /getPartnerCompletenessSummary/);
  assert.match(profile, /partner\?\.publishable && partner\?\.readyForPublication/);

  const specializedIndex = profile.indexOf("getCruisePartnerDetails,");
  const genericIndex = profile.indexOf("getPartnerDetails,", specializedIndex + 1);
  assert.ok(specializedIndex >= 0 && genericIndex > specializedIndex, "specialized details must precede generic fallback");

  assert.match(report, /content-first-logo-fallback-allowed/);
  assert.match(report, /ready-with-logo-fallback/);
  assert.match(report, /needs-content/);
  assert.match(report, /--strict-content=true/);
  assert.match(report, /identity-review/);
  assert.match(report, /blockers/);
  assert.match(report, /partnerCruiseDetails\.js[\s\S]*partnerDetails\.js/);
  assert.match(report, /process\.exitCode = 2/);

  assert.match(audit, /detailPrecedence: "specialized-before-generic-fallback"/);
  assert.match(audit, /partnerCruiseDetails\.js[\s\S]*partnerDetails\.js/);
});
