"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  consolidateQualityUpliftActions,
  recommendedFields,
} = require("../src/modules/minisite-seo-enrichment/quality-uplift-action-planner");

test("recommendedFields favors body/depth and preserves already qualified metadata", () => {
  const fields = recommendedFields({
    intentQuality: {
      missingSignals: ["body", "depth"],
    },
    thinContent: { missingWords: 50 },
  });

  assert.deepEqual(fields, ["body"]);
});

test("recommendedFields only includes title meta and h1 when those signals are missing", () => {
  const fields = recommendedFields({
    intentQuality: {
      missingSignals: ["title", "meta", "h1"],
    },
  });

  assert.deepEqual(fields, ["title", "meta", "h1"]);
});

test("consolidateQualityUpliftActions merges three warnings into one page action", () => {
  const result = consolidateQualityUpliftActions({
    intentOpportunities: [
      {
        pageSlug: "services",
        currentStatus: "weak",
        currentScore: 45,
        missingSignals: ["body", "depth"],
      },
    ],
    thinContentOpportunities: [
      {
        pageSlug: "services",
        wordCount: 72,
        missingWords: 48,
      },
    ],
    internalLinkOpportunities: [
      {
        pageSlug: "services",
        suggestedSourceSlugs: ["home", "agence"],
      },
    ],
  });

  assert.equal(result.readOnly, true);
  assert.equal(result.actionCount, 1);
  assert.equal(result.actions[0].pageSlug, "services");
  assert.deepEqual(result.actions[0].recommendedFields, ["body", "internal-link"]);
  assert.equal(result.actions[0].changePolicy.rewriteTitleOnlyIfMissingSignal, false);
  assert.equal(result.actions[0].changePolicy.rewriteMetaOnlyIfMissingSignal, false);
  assert.equal(result.actions[0].changePolicy.rewriteH1OnlyIfMissingSignal, false);
  assert.deepEqual(result.actions[0].suggestedSourceSlugs, ["home", "agence"]);
  assert.equal(result.actions[0].priority, "high");
});

test("consolidated actions are deterministic and sorted by priority", () => {
  const result = consolidateQualityUpliftActions({
    intentOpportunities: [
      {
        pageSlug: "croisieres",
        currentStatus: "partial",
        missingSignals: ["meta"],
      },
    ],
    thinContentOpportunities: [
      {
        pageSlug: "avis",
        wordCount: 40,
        missingWords: 80,
      },
    ],
    internalLinkOpportunities: [],
  });

  assert.equal(result.actionCount, 2);
  assert.equal(result.actions[0].pageSlug, "avis");
  assert.equal(result.actions[1].pageSlug, "croisieres");
});
