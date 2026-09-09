import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const band = readFileSync(new URL("../components/public-site/PublicReassuranceBand.js", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url), "utf8");

test("MSE-25.156 public route feeds legal runtime values to reassurance", () => {
  assert.match(route, /runtimeLegalValues/);
  assert.match(route, /fetchPublicBrandLegalRuntime\(resolved\.siteSlug\)/);
  assert.match(route, /const legalValues = runtimeLegalValues\(runtime\)/);
  assert.match(route, /<PublicReassuranceBand legalValues=\{legalValues\} \/>/);
});

test("MSE-25.156 legal reassurance is emitted only from explicit runtime fields", () => {
  assert.match(band, /values\.travelRegistration/);
  assert.match(band, /values\.financialGuarantee/);
  assert.match(band, /values\.professionalInsurance/);
  assert.match(band, /if \(travelRegistration\)/);
  assert.match(band, /if \(financialGuarantee\)/);
  assert.match(band, /if \(professionalInsurance\)/);
});

test("MSE-25.156 provider identity is never inferred", () => {
  assert.doesNotMatch(band, /Atout France/);
  assert.doesNotMatch(band, /GROUPAMA/);
  assert.doesNotMatch(band, /knowsAbout|award|credential/);
});
