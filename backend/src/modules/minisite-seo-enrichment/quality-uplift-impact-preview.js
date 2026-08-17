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

function warningRows(plan = {}) {
  return [
    ...(plan.intentOpportunities || []).map((item) => ({ kind: "intent-quality", pageSlug: item.pageSlug })),
    ...(plan.thinContentOpportunities || []).map((item) => ({ kind: "thin-content", pageSlug: item.pageSlug })),
    ...(plan.internalLinkOpportunities || []).map((item) => ({ kind: "internal-link", pageSlug: item.pageSlug })),
  ];
}

function warningKey(row = {}) {
  return `${String(row.kind || "")}:${String(row.pageSlug || "")}`;
}

function pageWarningCounts(plan = {}) {
  const map = new Map();
  for (const row of warningRows(plan)) {
    const slug = String(row.pageSlug || "home");
    const current = map.get(slug) || { total: 0, kinds: [] };
    current.total += 1;
    if (!current.kinds.includes(row.kind)) current.kinds.push(row.kind);
    map.set(slug, current);
  }
  return map;
}

function projectedPageImpact(currentPlan = {}, projectedPlan = {}, proposals = []) {
  const beforeRows = warningRows(currentPlan);
  const afterRows = warningRows(projectedPlan);
  const afterKeys = new Set(afterRows.map(warningKey));
  const beforeByPage = pageWarningCounts(currentPlan);
  const afterByPage = pageWarningCounts(projectedPlan);
  const proposalByPage = new Map((proposals || []).map((proposal) => [String(proposal.pageSlug || "home"), proposal]));
  const slugs = new Set([
    ...beforeByPage.keys(),
    ...afterByPage.keys(),
    ...proposalByPage.keys(),
  ]);

  return Array.from(slugs)
    .sort((left, right) => left.localeCompare(right, "fr"))
    .map((pageSlug) => {
      const before = beforeByPage.get(pageSlug) || { total: 0, kinds: [] };
      const after = afterByPage.get(pageSlug) || { total: 0, kinds: [] };
      const resolvedKinds = beforeRows
        .filter((row) => String(row.pageSlug || "home") === pageSlug && !afterKeys.has(warningKey(row)))
        .map((row) => row.kind);
      const proposal = proposalByPage.get(pageSlug) || null;
      const nonSimulatedOperationTypes = (proposal?.operations || [])
        .filter((operation) => !["enrich-body", "add-internal-link"].includes(operation.type))
        .map((operation) => operation.type);

      return {
        pageSlug,
        beforeWarnings: before.total,
        projectedWarnings: after.total,
        projectedReduction: Math.max(0, before.total - after.total),
        beforeKinds: before.kinds,
        projectedKinds: after.kinds,
        resolvedKinds,
        projectionComplete: nonSimulatedOperationTypes.length === 0,
        nonSimulatedOperationTypes,
      };
    });
}

function projectQualityUpliftImpact({ site = {}, currentPlan = {}, proposals = [], minimumWords = 120 } = {}) {
  const projectedSite = clone(site);
  let simulatedBodyOperations = 0;
  let simulatedInternalLinkOperations = 0;
  let nonSimulatedOperations = 0;
  const nonSimulatedOperationTypes = [];

  for (const proposal of proposals || []) {
    const targetPage = findPage(projectedSite, proposal.pageSlug);
    for (const operation of proposal.operations || []) {
      if (operation.type === "enrich-body") {
        if (appendBodyPreview(targetPage, proposal.bodyCopyPreview)) simulatedBodyOperations += 1;
      } else if (operation.type === "add-internal-link") {
        if (appendInternalLink(projectedSite, proposal, operation)) simulatedInternalLinkOperations += 1;
      } else {
        nonSimulatedOperations += 1;
        if (!nonSimulatedOperationTypes.includes(operation.type)) nonSimulatedOperationTypes.push(operation.type);
      }
    }
  }

  const projectedPlan = buildLocalSeoQualityUpliftPlan(projectedSite, { minimumWords });
  const before = counts(currentPlan);
  const after = counts(projectedPlan);
  const pages = projectedPageImpact(currentPlan, projectedPlan, proposals);

  return {
    version: "mse-25.31",
    operation: "preview-quality-uplift-impact",
    readOnly: true,
    writes: false,
    destructive: false,
    projectionComplete: nonSimulatedOperations === 0,
    simulation: {
      simulatedBodyOperations,
      simulatedInternalLinkOperations,
      nonSimulatedOperations,
      nonSimulatedOperationTypes,
    },
    before,
    projected: after,
    projectedReduction: reduction(before, after),
    pages,
  };
}

module.exports = {
  appendBodyPreview,
  appendInternalLink,
  counts,
  pageWarningCounts,
  projectQualityUpliftImpact,
  projectedPageImpact,
  reduction,
  warningRows,
};
