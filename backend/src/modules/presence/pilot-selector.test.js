"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildPilotAgencyRecommendations } = require("./pilot-selector");

const state = {
  agencies: [{ id: 1, name: "Gien", city: "Gien" }, { id: 2, name: "Nevers", city: "Nevers" }, { id: 3, name: "Dax", city: "Dax" }],
  interventionQueue: [
    { source: "nap_anomaly", agencyId: 1, agencyName: "Gien", providerKey: "google_business_profile", remediationKind: "managed_api", executable: true, drift: ["phone"], score: 80 },
    { source: "nap_anomaly", agencyId: 2, agencyName: "Nevers", providerKey: "google_business_profile", remediationKind: "managed_api", executable: true, drift: ["address"], score: 70 },
    { source: "nap_anomaly", agencyId: 3, agencyName: "Dax", providerKey: "google_business_profile", remediationKind: "managed_api", executable: true, drift: ["website"], score: 40 }
  ]
};

test("pilot selector recommends only non-sensitive fully executable Google agencies", () => {
  const result = buildPilotAgencyRecommendations(state, { maxAgencies: 3 });
  assert.deepEqual(result.recommendedAgencyIds, [3, 1]);
  assert.equal(result.eligibleCount, 2);
  assert.equal(result.candidates.find((item) => item.agencyId === 2).eligible, false);
});

test("pilot selector respects maximum agency count", () => {
  const result = buildPilotAgencyRecommendations(state, { maxAgencies: 1 });
  assert.deepEqual(result.recommendedAgencyIds, [3]);
});
