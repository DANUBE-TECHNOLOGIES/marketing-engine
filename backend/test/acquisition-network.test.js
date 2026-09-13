"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FUNNEL_VERSION,
  NETWORK_AGENCIES,
  getFunnel,
} = require("../src/modules/acquisition-funnel");

test("MSE-25.208 registers soleil-hiver for the network", () => {
  assert.equal(NETWORK_AGENCIES.length, 9);
  for (const agency of NETWORK_AGENCIES) {
    const funnel = getFunnel(agency.publicSiteSlug, "soleil-hiver");
    assert.ok(funnel, `missing funnel for ${agency.publicSiteSlug}`);
    assert.equal(funnel.siteSlug, agency.siteSlug);
    assert.equal(funnel.publicSiteSlug, agency.publicSiteSlug);
    assert.equal(funnel.agencyCity, agency.agencyCity);
    assert.equal(funnel.version, FUNNEL_VERSION);
    assert.equal(funnel.questions.length, 6);
  }
});

test("MSE-25.208 rejects unknown agency and campaign combinations", () => {
  assert.equal(getFunnel("unknown-agency", "soleil-hiver"), null);
  assert.equal(getFunnel("gien", "unknown-campaign"), null);
});
