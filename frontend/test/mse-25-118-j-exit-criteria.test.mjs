import assert from "node:assert/strict";
import test from "node:test";

import { buildAgencyLocalSearchMeasurement } from "../lib/seo/local-search-measurement.js";
import { buildLocalSearchRemediation } from "../lib/seo/local-search-remediation.js";

test("MSE-25.118j behaviorally classifies a usable weak-position case", () => {
  const measurement = buildAgencyLocalSearchMeasurement({
    agencyKey: "bois-colombes",
    current: {
      impressions: 100,
      clicks: 4,
      position: 15.2,
    },
    period: { start: "2026-08-01", end: "2026-08-31" },
  });

  assert.equal(measurement.assessment.status, "weak-position");
  assert.equal(measurement.assessment.confidence, "usable");
  assert.equal(measurement.assessment.recommendation, "strengthen-existing-page-relevance");
  assert.equal(measurement.automatedPublicChangeAllowed, false);
  assert.equal(measurement.googleWriteAllowed, false);

  const remediation = buildLocalSearchRemediation({
    agencyKey: "bois-colombes",
    measurement,
    publication: { status: "published" },
  });

  assert.equal(remediation.actionType, "existing-page-relevance");
  assert.equal(remediation.createDoorwayPageAllowed, false);
  assert.equal(remediation.automatedPublicChangeAllowed, false);
  assert.equal(remediation.googleWriteAllowed, false);
});

test("MSE-25.118j behaviorally recognises real improvement against a comparable baseline", () => {
  const measurement = buildAgencyLocalSearchMeasurement({
    agencyKey: "nevers",
    baseline: {
      impressions: 50,
      clicks: 2,
      position: 9.5,
    },
    current: {
      impressions: 80,
      clicks: 5,
      position: 7.4,
    },
    period: { start: "2026-08-01", end: "2026-08-31" },
  });

  assert.equal(measurement.assessment.status, "improving");
  assert.equal(measurement.assessment.confidence, "usable");
  assert.equal(measurement.assessment.trend, "improving");
  assert.equal(measurement.assessment.comparison.impressionsDelta, 30);
  assert.equal(measurement.assessment.comparison.clicksDelta, 3);
  assert.equal(measurement.assessment.comparison.positionDelta > 0, true);
  assert.equal(measurement.assessment.recommendation, "preserve-and-monitor");
  assert.equal(measurement.automatedPublicChangeAllowed, false);
  assert.equal(measurement.googleWriteAllowed, false);

  const remediation = buildLocalSearchRemediation({
    agencyKey: "nevers",
    measurement,
    publication: { status: "published" },
  });

  assert.equal(remediation.actionType, "preserve-and-monitor");
  assert.equal(remediation.automatedPublicChangeAllowed, false);
  assert.equal(remediation.googleWriteAllowed, false);
});
