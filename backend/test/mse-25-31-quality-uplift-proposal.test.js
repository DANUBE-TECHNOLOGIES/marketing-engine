"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildQualityUpliftProposal,
  proposalForAction,
} = require("../src/modules/minisite-seo-enrichment/quality-uplift-proposal-planner");

test("proposal prefers body enrichment and contextual internal linking without metadata rewrite", () => {
  const proposal = proposalForAction({
    pageSlug: "services",
    priority: "high",
    priorityScore: 92,
    recommendedFields: ["body", "internal-link"],
    suggestedSourceSlugs: ["home", "agence"],
    changePolicy: { preserveManualCopy: true },
    thinContent: { minimumWords: 120, missingWords: 46 },
  });

  assert.equal(proposal.readOnly, true);
  assert.equal(proposal.writes, false);
  assert.equal(proposal.requiresExplicitApply, true);
  assert.deepEqual(
    proposal.operations.map((item) => item.type),
    ["enrich-body", "add-internal-link"]
  );
  assert.equal(proposal.safeguards.preserveManualCopy, true);
  assert.equal(proposal.safeguards.metadataRewriteAllowed, false);
  assert.equal(proposal.safeguards.h1RewriteAllowed, false);
  assert.deepEqual(
    proposal.operations[1].suggestedSourceSlugs,
    ["home", "agence"]
  );
});

test("metadata and h1 rewrites are only proposed when upstream action explicitly requested them", () => {
  const proposal = proposalForAction({
    pageSlug: "croisieres",
    recommendedFields: ["title", "meta", "h1"],
    changePolicy: { preserveManualCopy: true },
  });

  assert.deepEqual(
    proposal.operations.map((item) => item.type),
    ["strengthen-title", "strengthen-meta-description", "strengthen-h1"]
  );
  assert.equal(proposal.safeguards.metadataRewriteAllowed, true);
  assert.equal(proposal.safeguards.h1RewriteAllowed, true);
  assert.equal(proposal.operations.some((item) => item.type === "enrich-body"), false);
});

test("network proposal contract remains entirely read-only", () => {
  const result = buildQualityUpliftProposal({
    actions: [
      {
        pageSlug: "avis",
        priority: "medium",
        recommendedFields: ["body"],
        changePolicy: { preserveManualCopy: true },
        thinContent: { minimumWords: 120, missingWords: 60 },
      },
    ],
  });

  assert.equal(result.version, "mse-25.31");
  assert.equal(result.operation, "preview-quality-uplift-proposal");
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.destructive, false);
  assert.equal(result.proposalCount, 1);
  assert.equal(result.operationCount, 1);
});
