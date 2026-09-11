const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const script = fs.readFileSync(
  path.join(
    __dirname,
    "../scripts/mse-25-204-lamorlaye-contact-local-grounding-v1.js"
  ),
  "utf8"
);

test("MSE-25.204 targets the exact Lamorlaye Contact page", () => {
  assert.match(script, /cms8n8jdu00j7n91axodw128b/);
  assert.match(script, /cms8n8oeu00m5n91awt8asqjd/);
  assert.match(script, /mondescale-lamorlaye/);
  assert.match(script, /contact/);
});

test("MSE-25.204 carries the approved Contact SEO contract", () => {
  assert.match(
    script,
    /Contact & accès \| Agence Mondescale Lamorlaye/
  );
  assert.match(
    script,
    /Contactez votre agence de voyages à Lamorlaye/
  );
  assert.match(script, /préparer votre projet de voyage avec Stéphanie/);
});

test("MSE-25.204 enriches the existing editorial block only", () => {
  assert.match(script, /lamorlaye-contact-editorial-v1/);
  assert.match(script, /Expected exactly one \$\{EDITORIAL_NAME\}/);
  assert.doesNotMatch(script, /pageBlock\.create/);
  assert.doesNotMatch(script, /createMany/);
  assert.doesNotMatch(script, /updateMany/);
});

test("MSE-25.204 does not duplicate NAP in editorial HTML", () => {
  const htmlMatch = script.match(
    /editorialHtml:\s*([\s\S]*?)\n\}\);/
  );

  assert.ok(htmlMatch);
  assert.doesNotMatch(htmlMatch[1], /29 avenue/i);
  assert.doesNotMatch(htmlMatch[1], /60260/);
  assert.doesNotMatch(htmlMatch[1], /03 44 21 59 98/);
  assert.doesNotMatch(htmlMatch[1], /lamorlaye@mondescale\.com/);
});

test("MSE-25.204 protects routes, non-contact pages and agency facts", () => {
  assert.match(script, /protectedShape/);
  assert.match(script, /routes:/);
  assert.match(script, /nonContact:/);
  assert.match(script, /agency:/);
  assert.match(script, /protectedFingerprintBefore/);
  assert.match(script, /protectedFingerprintAfter/);
});

test("MSE-25.204 supports dry-run, snapshot and rollback", () => {
  assert.match(script, /MSE_25_204_CONFIRM/);
  assert.match(script, /MSE_25_204_ROLLBACK/);
  assert.match(
    script,
    /mse-25-204-lamorlaye-contact-local-grounding-v1\.snapshot\.json/
  );
  assert.match(script, /DRY_RUN — no database write/);
});

test("MSE-25.204 does not modify route or canonical surfaces", () => {
  assert.doesNotMatch(script, /canonical/i);
  assert.doesNotMatch(script, /sitemap/i);
  assert.doesNotMatch(script, /basePath:\s*TARGET/);
  assert.doesNotMatch(script, /path:\s*TARGET/);
  assert.doesNotMatch(script, /slug:\s*TARGET/);
});

test("MSE-25.204 keeps draft functional blocks outside publication scope", () => {
  assert.doesNotMatch(script, /blockType:\s*"form"/);
  assert.doesNotMatch(script, /blockType:\s*"hours"/);
  assert.doesNotMatch(script, /blockType:\s*"map"/);
  assert.doesNotMatch(script, /blockType:\s*"faq"/);
});
