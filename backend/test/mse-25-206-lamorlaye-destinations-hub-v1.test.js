const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const script = fs.readFileSync(
  "backend/scripts/mse-25-206-lamorlaye-destinations-hub-v1.js",
  "utf8"
);

test("MSE-25.206 targets exact Lamorlaye Destinations hub", () => {
  assert.match(script, /cms8n8jdu00j7n91axodw128b/);
  assert.match(script, /cms8n8noo00l5n91au0gfhgl7/);
  assert.match(script, /PAGE_SLUG = "destinations"/);
  assert.match(script, /pageType !== "DESTINATIONS"/);
});

test("MSE-25.206 carries approved destination SEO contract", () => {
  assert.match(
    script,
    /Destinations de voyage \| Mondescale Lamorlaye/
  );
  assert.match(
    script,
    /Où partir \? Les destinations de votre agence de Lamorlaye/
  );
  assert.match(script, /budget et vos envies avec Stéphanie/);
});

test("MSE-25.206 preserves the exact six destination references", () => {
  assert.match(script, /destinationContract/);
  assert.match(
    script,
    /destinationItems\.length !== 6/
  );
  assert.match(
    script,
    /items: before\.grid\.content\.items/
  );
});

test("MSE-25.206 adds grounded travel-intent vocabulary", () => {
  assert.match(script, /d’un circuit/);
  assert.match(script, /d’un autotour/);
  assert.match(script, /construit sur mesure/);
  assert.match(script, /Stéphanie/);
});

test("MSE-25.206 does not claim the six destinations are exhaustive", () => {
  assert.match(
    script,
    /destinations actuellement présentées/
  );
  assert.match(
    script,
    /projet qui n’y figure pas encore/
  );
});

test("MSE-25.206 retires generic text and generic FAQ on both viewports", () => {
  assert.match(script, /TEXT_ID/);
  assert.match(script, /FAQ_ID/);

  const falseCount =
    (script.match(/visibleDesktop: false/g) || []).length +
    (script.match(/visibleMobile: false/g) || []).length;

  assert.ok(falseCount >= 4);
});

test("MSE-25.206 uses canonical Lamorlaye CTA routes", () => {
  assert.match(
    script,
    /\/agence\/mondescale-lamorlaye\/contact/
  );
  assert.match(
    script,
    /\/agence\/mondescale-lamorlaye\/services/
  );
  assert.doesNotMatch(script, /href: "\/contact"/);
});

test("MSE-25.206 protects routes, non-destination pages and agency facts", () => {
  assert.match(script, /protectedFingerprint/);
  assert.match(script, /nonDestinationPages/);
  assert.match(script, /destinationContract/);
  assert.match(script, /postalCode/);
  assert.match(script, /phone/);
});

test("MSE-25.206 supports dry-run snapshot and rollback", () => {
  assert.match(script, /MSE_25_206_CONFIRM/);
  assert.match(script, /MSE_25_206_ROLLBACK/);
  assert.match(
    script,
    /mse-25-206-lamorlaye-destinations-hub-v1\.snapshot\.json/
  );
});

test("MSE-25.206 does not create destination pages or mutate routing surfaces", () => {
  assert.doesNotMatch(script, /agencySitePage\.create/);
  assert.doesNotMatch(script, /pageBlock\.create/);
  assert.doesNotMatch(script, /updateMany/);
  assert.doesNotMatch(script, /canonical/i);
  assert.doesNotMatch(script, /sitemap/i);
});

test("MSE-25.206 does not introduce USA as a destination record", () => {
  assert.doesNotMatch(script, /destination.*USA/i);
  assert.doesNotMatch(script, /destination.*États-Unis/i);
});

test("MSE-25.206 exposes grid introduction through renderer-supported text field", () => {
  assert.match(
    script,
    /text:\s*"Soleil, plages, découvertes ou dépaysement : explorez les destinations actuellement présentées par votre agence\."/
  );
});
