"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const SCRIPT = path.join(__dirname, "../scripts/mse-25-209-melun-legal-profile-grounding-v1.js");
const source = fs.readFileSync(SCRIPT, "utf8");

test("MSE-25.209 is strictly scoped to Melun legal profile agency 8", () => {
  assert.match(source, /const EXPECTED_AGENCY_ID = 8;/);
  assert.match(source, /const EXPECTED_PROFILE_ID = "cmtcpy7v30001o2vhakd59ske";/);
  assert.match(source, /const TARGET_SITE_SLUG = "tui-store-melun";/);
  assert.match(source, /const EXPECTED_TENANT_ID = "tenant_mondescale";/);
});

test("MSE-25.209 replaces only the confirmed Maurepas RGPD residue with SAS DANUBE", () => {
  assert.match(source, /Ambassade FRAM - Mondescale Maurepas/);
  assert.match(source, /Le ciblage publicitaire par SAS DANUBE via les réseaux sociaux ou bien par newsletter\/SMS/);
  assert.match(source, /current\.replace\(SOURCE_FRAGMENT, TARGET_FRAGMENT\)/);
  assert.match(source, /sourceCount !== 1/);
  assert.match(source, /sourceTokenCount !== 1/);
});

test("MSE-25.209 writes only legalNoticeContent", () => {
  const updateBlocks = [...source.matchAll(/prisma\.legalProfile\.update\(\{([\s\S]*?)\n\s*\}\);/g)].map((m) => m[1]);
  assert.ok(updateBlocks.length >= 2, "expected APPLY and rollback legalProfile updates");
  for (const block of updateBlocks) {
    assert.match(block, /data:\s*\{\s*legalNoticeContent:/);
    assert.doesNotMatch(block, /privacyPolicyContent\s*:/);
    assert.doesNotMatch(block, /cookiePolicyContent\s*:/);
    assert.doesNotMatch(block, /termsContent\s*:/);
    assert.doesNotMatch(block, /name\s*:/);
    assert.doesNotMatch(block, /agencyId\s*:/);
  }
});

test("MSE-25.209 is dry-run by default and requires explicit APPLY", () => {
  assert.match(source, /MSE_25_209_CONFIRM/);
  assert.match(source, /MSE_25_209_ROLLBACK/);
  assert.match(source, /mode: "DRY_RUN"/);
  assert.match(source, /mode: "APPLY"/);
  assert.match(source, /mode: "ROLLBACK"/);
  assert.match(source, /mutationPerformed: false/);
});

test("MSE-25.209 snapshots and protects all non-target legal fields", () => {
  assert.match(source, /mse-25-209-melun-legal-profile-grounding-v1\.snapshot\.json/);
  assert.match(source, /legalNoticeContent: "__TARGET__"/);
  assert.match(source, /privacyPolicyContent: profile\.privacyPolicyContent/);
  assert.match(source, /cookiePolicyContent: profile\.cookiePolicyContent/);
  assert.match(source, /termsContent: profile\.termsContent/);
  assert.match(source, /un champ protégé du profil juridique a changé/);
});

test("MSE-25.209 does not modify shared public renderer or Lamorlaye", () => {
  assert.doesNotMatch(source, /mondescale-lamorlaye/);
  assert.doesNotMatch(source, /ambassade-fram-mondescale-lamorlaye/);
  assert.doesNotMatch(source, /BusinessTravelPage/);
  assert.doesNotMatch(source, /public-render-contract/);
  assert.doesNotMatch(source, /public-site-shell-api/);
});
