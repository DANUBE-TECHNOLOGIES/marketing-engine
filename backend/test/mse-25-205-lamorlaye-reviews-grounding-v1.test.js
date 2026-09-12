const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const script = fs.readFileSync(
  "backend/scripts/mse-25-205-lamorlaye-reviews-grounding-v1.js",
  "utf8"
);

test("MSE-25.205 targets the exact Lamorlaye reviews page", () => {
  assert.match(
    script,
    /cms8n8jdu00j7n91axodw128b/
  );
  assert.match(
    script,
    /cms8n8o6i00ltn91avznzg60l/
  );
  assert.match(
    script,
    /mondescale-lamorlaye/
  );
  assert.match(
    script,
    /PAGE_SLUG = "avis"/
  );
});

test("MSE-25.205 carries approved review SEO contract", () => {
  assert.match(
    script,
    /Avis clients Mondescale Lamorlaye \| Agence de voyages/
  );
  assert.match(
    script,
    /Avis sur votre agence Mondescale Lamorlaye/
  );
  assert.match(
    script,
    /voyages sur mesure et autres projets de vacances avec Stéphanie/
  );
});

test("MSE-25.205 preserves Google as authoritative review source", () => {
  assert.match(
    script,
    /dataSource !==\s*"google-reviews"/
  );

  assert.doesNotMatch(
    script,
    /createMany/
  );

  assert.doesNotMatch(
    script,
    /review\.create/
  );
});

test("MSE-25.205 uses only grounded public review evidence", () => {
  assert.match(
    script,
    /séjour tout compris en République dominicaine/
  );
  assert.match(
    script,
    /road trip sur mesure dans l’Ouest américain/
  );
  assert.match(
    script,
    /Stéphanie/
  );
});

test("MSE-25.205 removes redundant generic reviews text from both viewports", () => {
  assert.match(
    script,
    /GENERIC_TEXT_BLOCK_ID/
  );
  assert.match(
    script,
    /visibleDesktop:\s*false/
  );
  assert.match(
    script,
    /visibleMobile:\s*false/
  );
});

test("MSE-25.205 grounds CTA on managed published agency routes", () => {
  assert.match(
    script,
    /\/agence\/mondescale-lamorlaye\/contact/
  );
  assert.match(
    script,
    /\/agence\/mondescale-lamorlaye\/equipe/
  );
  assert.doesNotMatch(
    script,
    /href:\s*"\/contact"/
  );
});

test("MSE-25.205 protects routes, other Lamorlaye pages and agency facts", () => {
  assert.match(
    script,
    /protectedFingerprint/
  );
  assert.match(
    script,
    /nonReviewsPages/
  );
  assert.match(
    script,
    /googleLocationId/
  );
  assert.match(
    script,
    /googleReviewUrl/
  );
});

test("MSE-25.205 supports dry-run snapshot and rollback", () => {
  assert.match(
    script,
    /MSE_25_205_CONFIRM/
  );
  assert.match(
    script,
    /MSE_25_205_ROLLBACK/
  );
  assert.match(
    script,
    /mse-25-205-lamorlaye-reviews-grounding-v1\.snapshot\.json/
  );
});

test("MSE-25.205 does not create blocks or modify route surfaces", () => {
  assert.doesNotMatch(
    script,
    /pageBlock\.create/
  );
  assert.doesNotMatch(
    script,
    /updateMany/
  );
  assert.doesNotMatch(
    script,
    /canonical/i
  );
  assert.doesNotMatch(
    script,
    /sitemap/i
  );
});

test("MSE-25.205 does not modify Google review records", () => {
  assert.doesNotMatch(
    script,
    /googleReview\.update/
  );
  assert.doesNotMatch(
    script,
    /googleReview\.delete/
  );
  assert.doesNotMatch(
    script,
    /reviewResponses?\.(create|update|delete)/
  );
});
