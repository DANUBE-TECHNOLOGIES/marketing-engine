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

  const specializedGetters = [
    "getCruisePartnerDetails",
    "getCircuitPartnerDetails",
    "getStayPartnerDetails",
    "getLongHaulPartnerDetails",
    "getFranceEuropePartnerDetails",
  ];
  for (const getter of specializedGetters) assert.match(profile, new RegExp(getter));
  assert.doesNotMatch(profile, /getPartnerDetails/);
  assert.match(profile, /const DETAIL_GETTERS = Object\.freeze\(\[/);

  assert.match(report, /content-first-logo-fallback-allowed/);
  assert.match(report, /ready-with-logo-fallback/);
  assert.match(report, /needs-content/);
  assert.match(report, /--strict-content=true/);
  assert.match(report, /identity-review/);
  assert.match(report, /blockers/);
  for (const fileName of [
    "partnerCruiseDetails.js",
    "partnerCircuitDetails.js",
    "partnerStayDetails.js",
    "partnerLongHaulDetails.js",
    "partnerFranceEuropeDetails.js",
  ]) assert.match(report, new RegExp(fileName.replace(".", "\\.")));
  assert.doesNotMatch(report, /partnerDetails\.js/);
  assert.match(report, /process\.exitCode = 2/);

  assert.match(audit, /editorialSources:\s*"category-specialized-only"/);
  for (const fileName of [
    "partnerCruiseDetails.js",
    "partnerCircuitDetails.js",
    "partnerStayDetails.js",
    "partnerLongHaulDetails.js",
    "partnerFranceEuropeDetails.js",
  ]) assert.match(audit, new RegExp(fileName.replace(".", "\\.")));
  assert.doesNotMatch(audit, /partnerDetails\.js/);
});
