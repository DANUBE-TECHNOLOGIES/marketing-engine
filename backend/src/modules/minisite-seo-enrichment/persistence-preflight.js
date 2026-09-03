"use strict";

const { validatePagePayload } = require("../page-builder-persistence/validation");
const { validateAndMigratePagePayload } = require("../page-builder-persistence/core-payload-adapter");

function persistencePayloadFor(page = {}) {
  const source = page?.page && typeof page.page === "object" ? page.page : {};
  const published = page.published === true || source.published === true;
  return {
    page: {
      title: page.title || source.title || page.slug || "Page",
      slug: page.slug ?? source.slug ?? "",
      status: source.status || (published ? "published" : "draft"),
      seoTitle: source.seoTitle || "",
      metaDescription: source.metaDescription || source.seoDescription || "",
      published,
    },
    blocks: page.optimizedBlocks || page.after || [],
  };
}

function persistenceValidationIssue(plan = {}, page = {}) {
  try {
    // Mirror PageBuilderPersistenceService.save() exactly: historical block
    // contracts must be migrated by the Core before strict V2 validation.
    // This keeps the preflight predictive of the actual rollout path instead
    // of rejecting payloads that persistence would safely migrate.
    const coreResult = validateAndMigratePagePayload(persistencePayloadFor(page));
    validatePagePayload(coreResult.payload);
    return null;
  } catch (error) {
    return {
      code: "PAGE_BUILDER_V2_PAYLOAD_INVALID",
      severity: "blocking",
      siteSlug: plan.siteSlug || null,
      slug: page.slug || null,
      persistenceCode: error?.code || "PAGE_BUILDER_V2_VALIDATION_ERROR",
      message: error?.message || String(error),
      details: error?.details || {},
    };
  }
}

function persistenceValidationIssues(plans = []) {
  const issues = [];
  for (const plan of plans || []) {
    for (const page of plan?.pages || []) {
      const issue = persistenceValidationIssue(plan, page);
      if (issue) issues.push(issue);
    }
  }
  return issues;
}

module.exports = {
  persistencePayloadFor,
  persistenceValidationIssue,
  persistenceValidationIssues,
};
