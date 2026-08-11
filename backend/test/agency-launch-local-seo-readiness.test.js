const test = require("node:test");
const assert = require("node:assert/strict");

const {
  localSeoCheck,
  score,
} = require("../src/modules/agency-launch/prepublication-readiness");

test("local SEO readiness is advisory and passes with Google profile signals", () => {
  const check = localSeoCheck({
    website: "https://agences.mondescale.com/agence/gien",
    googleLocationId: "locations/123",
    googleReviewUrl: "https://g.page/r/example/review",
  });

  assert.equal(check.required, false);
  assert.equal(check.passed, true);
  assert.deepEqual(check.missing, []);
});

test("missing local SEO enrichments reduce score without becoming blockers", () => {
  const check = localSeoCheck({});
  assert.equal(check.required, false);
  assert.equal(check.passed, false);
  assert.deepEqual(check.missing, ["website", "googleLocation", "googleReviewUrl"]);

  assert.equal(score([
    { code: "SITE", passed: true },
    { code: "IDENTITY", passed: true },
    { code: "GENERAL_CONTENT", passed: true },
    { code: "LEGAL", passed: true },
    { code: "SEO", passed: true },
    check,
  ]), 95);
});
