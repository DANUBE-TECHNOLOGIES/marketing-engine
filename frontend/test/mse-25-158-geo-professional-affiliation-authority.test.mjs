import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const band = readFileSync(new URL("../components/public-site/PublicReassuranceBand.js", import.meta.url), "utf8");
const resolver = readFileSync(new URL("../../backend/src/modules/public-brand-legal/resolver.js", import.meta.url), "utf8");

test("MSE-25.158 affiliations use explicit public settings authority", () => {
  assert.match(resolver, /"settings"/);
  assert.match(band, /settings\.professionalAffiliations/);
  assert.match(band, /normalizedProfessionalAffiliations/);
});

test("MSE-25.158 no professional affiliation is hardcoded globally", () => {
  assert.doesNotMatch(band, /CEDIV Travel/);
  assert.doesNotMatch(band, /Les Entreprises du Voyage/);
  assert.doesNotMatch(band, /const TRUST_REFERENCES/);
});

test("MSE-25.158 configured affiliations remain separate from legal facts", () => {
  assert.match(band, /normalizedProfessionalAffiliations\(legalValues\)/);
  assert.match(band, /legalTrustReferences\(legalValues\)/);
  assert.match(band, /Affiliations et informations légales publiées/);
});
