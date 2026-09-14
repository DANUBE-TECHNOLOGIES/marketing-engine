import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const band = readFileSync(new URL("../components/public-site/PublicReassuranceBand.js", import.meta.url), "utf8");
const legalRuntime = readFileSync(new URL("../../backend/src/modules/public-brand-legal/resolver.js", import.meta.url), "utf8");

test("MSE-25.155 legal reassurance facts have an explicit central authority", () => {
  assert.match(legalRuntime, /"travelRegistration"/);
  assert.match(legalRuntime, /"financialGuarantee"/);
  assert.match(legalRuntime, /"professionalInsurance"/);
});

test("MSE-25.155 public reassurance no longer hardcodes legal provider claims", () => {
  assert.doesNotMatch(band, /Atout France/);
  assert.doesNotMatch(band, /GROUPAMA/);
  assert.doesNotMatch(band, /Garantie financière & RCP/);
  assert.match(band, /Affiliations et informations légales publiées/);
});

test("MSE-25.155 professional affiliations remain distinct from legal guarantees", () => {
  assert.match(band, /professionalAffiliations/);
  assert.match(band, /normalizedProfessionalAffiliations/);
  assert.doesNotMatch(band, /Garanties & affiliations/);
});
