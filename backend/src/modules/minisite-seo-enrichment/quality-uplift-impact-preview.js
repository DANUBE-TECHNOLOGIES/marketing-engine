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
    content: {
      html: `<p>Découvrir cette page</p>`,
      links: [{ label: "Découvrir cette page", href: targetPath }],
    },
    seo: { generatedBy: "mse-25.31-impact-preview", purpose: "editorial-internal-link-simulation" },
  });
  return true;
}

function applyExactSeoOperation(page, operation = {}) {
  if (!page || !String(operation.finalValue || "").trim()) return false;
  if (operation.type === "strengthen-title" && operation.target?.scope === "page" && operation.target?.field === "seoTitle") {
    page.seoTitle = operation.finalValue;
    return true;
  }
  if (operation.type === "strengthen-meta-description" && operation.target?.scope === "page" && operation.target?.field === "metaDescription") {
    page.metaDescription = operation.finalValue;
    page.seoDescription = operation.finalValue;
    return true;
  }
  if (operation.type === "strengthen-h1" && operation.target?.scope === "block" && operation.target?.blockId !== null && operation.target?.blockId !== undefined) {
    const block = (page.blocks || []).find((item) => String(item?.id) === String(operation.target.blockId));
    if (!block || String(operation.target?.field || "") !== "title") return false;
    block.content = { ...(block.content || {}), title: operation.finalValue };
    return true;
  }
  return false;
}

function operationSimulationReady(operation = {}, proposal = {}) {
  if (operation.type === "enrich-body") {
    return Boolean(String(proposal.bodyCopyPreview?.html || "").trim());
  }
  if (operation.type === "add-internal-link") {
    return Boolean(
      String((operation.suggestedSourceSlugs || [])[0] || "").trim()
      && String(proposal.diagnostics?.internalLink?.path || "").trim()
    );
  }
  if (operation.type === "strengthen-title") {
    return Boolean(
      String(operation.finalValue || "").trim()
      && operation.target?.scope === "page"
      && operation.target?.field === "seoTitle"
    );
  }
  if (operation.type === "strengthen-meta-description") {
    return Boolean(
      String(operation.finalValue || "").trim()
      && operation.target?.scope === "page"
      && operation.target?.field === "metaDescription"
    );
  }
  if (operation.type === "strengthen-h1") {
    return Boolean(
      String(operation.finalValue || "").trim()
      && operation.target?.scope === "block"
      && operation.target?.blockId !== null
      && operation.target?.blockId !== undefined
      && operation.target?.field === "title"
    );
  }
  return false;
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
    ...(plan.intentOpportunities || []).map((item) => ({ kind: "intent-quality", pageSlug: item.pageSlug, discriminator: item.intent || item.label || "" })),
    ...(plan.thinContentOpportunities || []).map((item) => ({ kind: "thin-content", pageSlug: item.pageSlug, discriminator: "" })),
    ...(plan.internalLinkOpportunities || []).map((item) => ({ kind: "internal-link", pageSlug: item.pageSlug, discriminator: item.path || "" })),
  ];
}

function warningKey(row = {}) {
  return [row.kind, row.pageSlug, row.discriminator].map((value) => String(value || "")).join(":");
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
  const slugs = new Set([...beforeByPage.keys(), ...afterByPage.keys(), ...proposalByPage.keys()]);

  return Array.from(slugs)
    .sort((left, right) => left.localeCompare(right, "fr"))
    .map((pageSlug) => {
      const before = beforeByPage.get(pageSlug) || { total: 0, kinds: [] };
      const after = afterByPage.get(pageSlug) || { total: 0, kinds: [] };
      const resolvedRows = beforeRows.filter((row) => String(row.pageSlug || "home") === pageSlug && !afterKeys.has(warningKey(row)));
      const resolvedKinds = Array.from(new Set(resolvedRows.map((row) => row.kind)));
      const resolvedWarnings = resolvedRows.map((row) => ({ kind: row.kind, discriminator: row.discriminator || null }));
      const proposal = proposalByPage.get(pageSlug) || null;
      const nonSimulatedOperationTypes = Array.from(new Set(
        (proposal?.operations || [])
          .filter((operation) => !operationSimulationReady(operation, proposal))
          .map((operation) => operation.type)
      ));

      return {
        pageSlug,
        beforeWarnings: before.total,
        projectedWarnings: after.total,
        projectedReduction: Math.max(0, before.total - after.total),
        beforeKinds: before.kinds,
        projectedKinds: after.kinds,
        resolvedKinds,
        resolvedWarnings,
        projectionComplete: nonSimulatedOperationTypes.length === 0,
        nonSimulatedOperationTypes,
      };
    });
}

function projectQualityUpliftImpact({ site = {}, currentPlan = {}, proposals = [], minimumWords = 120 } = {}) {
  const projectedSite = clone(site);
  let simulatedBodyOperations = 0;
  let simulatedInternalLinkOperations = 0;
  let simulatedMetadataOperations = 0;
  let nonSimulatedOperations = 0;
  const nonSimulatedOperationTypes = [];

  for (const proposal of proposals || []) {
    const targetPage = findPage(projectedSite, proposal.pageSlug);
    for (const operation of proposal.operations || []) {
      if (operation.type === "enrich-body") {
        if (appendBodyPreview(targetPage, proposal.bodyCopyPreview)) simulatedBodyOperations += 1;
        else {
          nonSimulatedOperations += 1;
          if (!nonSimulatedOperationTypes.includes(operation.type)) nonSimulatedOperationTypes.push(operation.type);
        }
      } else if (operation.type === "add-internal-link") {
        if (appendInternalLink(projectedSite, proposal, operation)) simulatedInternalLinkOperations += 1;
        else {
          nonSimulatedOperations += 1;
          if (!nonSimulatedOperationTypes.includes(operation.type)) nonSimulatedOperationTypes.push(operation.type);
        }
      } else if (["strengthen-title", "strengthen-meta-description", "strengthen-h1"].includes(operation.type)) {
        if (applyExactSeoOperation(targetPage, operation)) simulatedMetadataOperations += 1;
        else {
          nonSimulatedOperations += 1;
          if (!nonSimulatedOperationTypes.includes(operation.type)) nonSimulatedOperationTypes.push(operation.type);
        }
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
      simulatedMetadataOperations,
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
  applyExactSeoOperation,
  counts,
  operationSimulationReady,
  pageWarningCounts,
  projectQualityUpliftImpact,
  projectedPageImpact,
  reduction,
  warningKey,
  warningRows,
};
