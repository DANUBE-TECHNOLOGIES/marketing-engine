"use strict";

const { buildLocalSeoQualityUpliftPlan } = require("./quality-uplift-planner");

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function findPage(site, slug) { return (site.pages || []).find((page) => String(page?.slug || "") === String(slug || "")) || null; }

function appendBodyPreview(page, copyPreview) {
  if (!page || !copyPreview?.html) return false;
  page.blocks = Array.isArray(page.blocks) ? page.blocks : [];
  page.blocks.push({
    blockType: "rich_text",
    status: "published",
    content: { title: copyPreview.title || "", html: copyPreview.html },
    seo: { generatedBy: "mse-25.31-impact-preview", purpose: "local-seo-quality-uplift-simulation" },
  });
  return true;
}

function appendInternalLink(site, proposal, operation) {
  const sourceSlug = (operation?.suggestedSourceSlugs || [])[0];
  const source = sourceSlug ? findPage(site, sourceSlug) : null;
  const targetPath = proposal?.diagnostics?.internalLink?.path || null;
  if (!source || !targetPath) return false;
  source.blocks = Array.isArray(source.blocks) ? source.blocks : [];
  source.blocks.push({
    blockType: "rich_text",
    status: "published",
    content: { html: `<p><a href="${String(targetPath).replace(/\"/g, "&quot;")}">Découvrir cette page</a></p>` },
    seo: { generatedBy: "mse-25.31-impact-preview", purpose: "editorial-internal-link-simulation" },
  });
  return true;
}

function counts(plan = {}) {
  return {
    intent: Number(plan.summary?.intentOpportunityCount || 0),
    thinContent: Number(plan.summary?.thinContentOpportunityCount || 0),
    internalLink: Number(plan.summary?.internalLinkOpportunityCount || 0),
    total: Number(plan.summary?.totalOpportunityCount || 0),
  };
}

function reduction(before, after) {
  return {
    intent: Math.max(0, before.intent - after.intent),
    thinContent: Math.max(0, before.thinContent - after.thinContent),
    internalLink: Math.max(0, before.internalLink - after.internalLink),
    total: Math.max(0, before.total - after.total),
  };
}

function projectQualityUpliftImpact({ site = {}, currentPlan = {}, proposals = [], minimumWords = 120 } = {}) {
  const projectedSite = clone(site);
  let simulatedBodyOperations = 0;
  let simulatedInternalLinkOperations = 0;
  let nonSimulatedOperations = 0;

  for (const proposal of proposals || []) {
    const targetPage = findPage(projectedSite, proposal.pageSlug);
    for (const operation of proposal.operations || []) {
      if (operation.type === "enrich-body") {
        if (appendBodyPreview(targetPage, proposal.bodyCopyPreview)) simulatedBodyOperations += 1;
      } else if (operation.type === "add-internal-link") {
        if (appendInternalLink(projectedSite, proposal, operation)) simulatedInternalLinkOperations += 1;
      } else {
        nonSimulatedOperations += 1;
      }
    }
  }

  const projectedPlan = buildLocalSeoQualityUpliftPlan(projectedSite, { minimumWords });
  const before = counts(currentPlan);
  const after = counts(projectedPlan);

  return {
    version: "mse-25.31",
    operation: "preview-quality-uplift-impact",
    readOnly: true,
    writes: false,
    destructive: false,
    projectionComplete: nonSimulatedOperations === 0,
    simulation: { simulatedBodyOperations, simulatedInternalLinkOperations, nonSimulatedOperations },
    before,
    projected: after,
    projectedReduction: reduction(before, after),
  };
}

module.exports = { appendBodyPreview, appendInternalLink, counts, projectQualityUpliftImpact, reduction };
