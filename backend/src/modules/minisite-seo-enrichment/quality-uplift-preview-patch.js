"use strict";

const crypto = require("node:crypto");
const { buildLocalSeoQualityUpliftPlan } = require("./quality-uplift-planner");
const { consolidateQualityUpliftActions } = require("./quality-uplift-action-planner");
const { buildQualityUpliftProposal } = require("./quality-uplift-proposal-planner");
const { buildBodyCopyPreview } = require("./quality-uplift-copy-preview");
const { projectQualityUpliftImpact } = require("./quality-uplift-impact-preview");
const { buildQualityUpliftOperatorReport } = require("./quality-uplift-operator-report");
const { networkQualityUpliftFingerprint, qualityUpliftFingerprint } = require("./quality-uplift-fingerprint");
const { titleForPage, descriptionForPage } = require("./generator");
const { buildHeroTitle } = require("./content-optimizer");

function siteFromAgencyPlan(plan = {}) {
  return {
    slug: plan.siteSlug || null,
    agencyId: plan.agencyId || null,
    agency: { id: plan.agencyId || null, name: plan.agencyName || null, city: plan.city || null },
    pages: (plan.pages || []).map((item) => ({
      ...(item.page || {}),
      slug: item.slug || item.page?.slug || null,
      title: item.title || item.page?.title || null,
      published: item.published === true || item.page?.published === true,
      blocks: item.currentBlocks || item.page?.blocks || [],
    })),
  };
}

function normalizedBlockType(block = {}) {
  return String(block.blockType || block.type || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function exactHeroTarget(page = {}) {
  const heroes = (page.blocks || []).filter((block) => normalizedBlockType(block).includes("hero"));
  if (heroes.length !== 1) return null;
  const hero = heroes[0];
  return {
    scope: "block",
    blockType: "hero",
    blockId: hero.id ?? null,
    field: "title",
  };
}

function sealOperationFinalValue(operation = {}, site = {}, page = {}) {
  if (operation.type === "strengthen-title") {
    return {
      ...operation,
      target: { scope: "page", field: "seoTitle" },
      finalValue: titleForPage({ agency: site.agency || {}, page }),
    };
  }
  if (operation.type === "strengthen-meta-description") {
    return {
      ...operation,
      target: { scope: "page", field: "metaDescription" },
      finalValue: descriptionForPage({ agency: site.agency || {}, page }),
    };
  }
  if (operation.type === "strengthen-h1") {
    return {
      ...operation,
      target: exactHeroTarget(page),
      finalValue: buildHeroTitle({ agency: site.agency || {}, page }),
    };
  }
  return { ...operation };
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exactInternalLinkSource(site = {}, operation = {}) {
  for (const sourceSlug of operation.suggestedSourceSlugs || []) {
    const page = (site.pages || []).find((item) => String(item?.slug || "") === String(sourceSlug || ""));
    if (!page) continue;
    const block = (page.blocks || []).find((item) =>
      item?.id !== null
      && item?.id !== undefined
      && normalizedBlockType(item).includes("rich-text")
      && typeof item?.content?.html === "string"
    );
    if (block) return { page, block };
  }
  return null;
}

function sealInternalLinkOperation(operation = {}, proposal = {}, site = {}, targetPage = {}) {
  const href = String(proposal?.diagnostics?.internalLink?.path || "").trim();
  const source = exactInternalLinkSource(site, operation);
  if (!href || !source) return { ...operation };

  const sourceHtml = String(source.block.content?.html || "");
  const targetLabel = String(targetPage.title || targetPage.slug || proposal.pageSlug || "cette page").trim();
  const label = `Découvrir ${targetLabel}`;
  const linkHtml = `<p><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`;

  return {
    ...operation,
    target: {
      scope: "block",
      pageSlug: source.page.slug || null,
      blockType: "rich_text",
      blockId: source.block.id,
      field: "content.html",
    },
    sourceValueFingerprint: sha256Text(sourceHtml),
    link: { href, label },
    finalValue: `${sourceHtml}${linkHtml}`,
  };
}

function proposalWithCopyPreview(proposal, action, site) {
  const page = (site.pages || []).find((item) => String(item?.slug || "") === String(proposal?.pageSlug || "")) || null;
  return {
    ...proposal,
    operations: page
      ? (proposal.operations || []).map((operation) =>
          operation.type === "add-internal-link"
            ? sealInternalLinkOperation(operation, proposal, site, page)
            : sealOperationFinalValue(operation, site, page)
        )
      : [...(proposal.operations || [])],
    bodyCopyPreview: page ? buildBodyCopyPreview({ agency: site.agency || {}, page, action }) : null,
  };
}

function sum(agencies, path) {
  return agencies.reduce((total, agency) => {
    let value = agency;
    for (const key of path) value = value?.[key];
    return total + Number(value || 0);
  }, 0);
}

function projectedPages(agencies = []) {
  return agencies.flatMap((agency) =>
    (agency.impact?.pages || []).map((page) => ({
      agencyId: agency.agencyId || null,
      siteSlug: agency.siteSlug || null,
      ...page,
    }))
  );
}

function installQualityUpliftPreview(ServiceClass) {
  if (!ServiceClass || ServiceClass.prototype.__mse2531QualityUpliftPreviewInstalled) return ServiceClass;

  ServiceClass.prototype.previewAgencyQualityUplift = async function previewAgencyQualityUplift({ agencyId, minimumWords = 120 } = {}) {
    const agencyPlan = await this.buildAgencyContentOptimization({ agencyId });
    const site = siteFromAgencyPlan(agencyPlan);
    const plan = buildLocalSeoQualityUpliftPlan(site, { minimumWords });
    const actionPlan = consolidateQualityUpliftActions(plan);
    const proposalPlan = buildQualityUpliftProposal(actionPlan);
    const proposals = proposalPlan.proposals.map((proposal, index) => proposalWithCopyPreview(proposal, actionPlan.actions[index], site));
    const impact = projectQualityUpliftImpact({ site, currentPlan: plan, proposals, minimumWords });
    const planFingerprint = qualityUpliftFingerprint({
      version: "mse-25.31",
      siteSlug: plan.siteSlug,
      agencyId: plan.agencyId,
      minimumWords: Number(minimumWords || 120),
      actions: actionPlan.actions,
    });

    return {
      operation: "preview-quality-uplift",
      writes: false,
      destructive: false,
      readOnly: true,
      minimumWords: Number(minimumWords || 120),
      ...plan,
      planFingerprint,
      actions: actionPlan.actions,
      actionSummary: {
        actionCount: actionPlan.actionCount,
        highPriorityCount: actionPlan.highPriorityCount,
        mediumPriorityCount: actionPlan.mediumPriorityCount,
        lowPriorityCount: actionPlan.lowPriorityCount,
      },
      proposals,
      proposalSummary: {
        proposalCount: proposalPlan.proposalCount,
        operationCount: proposalPlan.operationCount,
        bodyCopyPreviewCount: proposals.filter((item) => item.bodyCopyPreview).length,
        exactMetadataValueCount: proposals.reduce(
          (count, proposal) => count + (proposal.operations || []).filter((operation) =>
            ["strengthen-title", "strengthen-meta-description", "strengthen-h1"].includes(operation.type)
            && String(operation.finalValue || "").trim()
          ).length,
          0
        ),
        exactInternalLinkValueCount: proposals.reduce(
          (count, proposal) => count + (proposal.operations || []).filter((operation) =>
            operation.type === "add-internal-link"
            && String(operation.finalValue || "").trim()
            && operation.target?.blockId !== null
            && operation.target?.blockId !== undefined
          ).length,
          0
        ),
      },
      impact,
      excludedPages: agencyPlan.excludedPages || [],
    };
  };

  ServiceClass.prototype.previewNetworkQualityUplift = async function previewNetworkQualityUplift({ minimumWords = 120 } = {}) {
    const sites = await this.repository.listSites();
    const publishedSites = (sites || []).filter((site) => String(site?.status || "").toLowerCase() === "published");
    const excludedSites = (sites || [])
      .filter((site) => String(site?.status || "").toLowerCase() !== "published")
      .map((site) => ({ agencyId: site.agencyId || site.agency?.id || null, siteSlug: site.slug || null, status: site.status || null, reason: "site-not-published" }));
    const agencies = [];
    for (const site of publishedSites) {
      const agencyId = site.agencyId || site.agency?.id;
      if (agencyId) agencies.push(await this.previewAgencyQualityUplift({ agencyId, minimumWords }));
    }
    const pages = projectedPages(agencies);

    const response = {
      version: "mse-25.31",
      operation: "preview-network-quality-uplift",
      writes: false,
      destructive: false,
      readOnly: true,
      minimumWords: Number(minimumWords || 120),
      agencies,
      excludedSites,
      summary: {
        agenciesProcessed: agencies.length,
        agenciesExcluded: excludedSites.length,
        intentOpportunityCount: sum(agencies, ["summary", "intentOpportunityCount"]),
        thinContentOpportunityCount: sum(agencies, ["summary", "thinContentOpportunityCount"]),
        internalLinkOpportunityCount: sum(agencies, ["summary", "internalLinkOpportunityCount"]),
        totalOpportunityCount: sum(agencies, ["summary", "totalOpportunityCount"]),
        pageActionCount: sum(agencies, ["actionSummary", "actionCount"]),
        highPriorityPageCount: sum(agencies, ["actionSummary", "highPriorityCount"]),
        mediumPriorityPageCount: sum(agencies, ["actionSummary", "mediumPriorityCount"]),
        lowPriorityPageCount: sum(agencies, ["actionSummary", "lowPriorityCount"]),
        proposalCount: sum(agencies, ["proposalSummary", "proposalCount"]),
        proposedOperationCount: sum(agencies, ["proposalSummary", "operationCount"]),
        bodyCopyPreviewCount: sum(agencies, ["proposalSummary", "bodyCopyPreviewCount"]),
        exactMetadataValueCount: sum(agencies, ["proposalSummary", "exactMetadataValueCount"]),
        exactInternalLinkValueCount: sum(agencies, ["proposalSummary", "exactInternalLinkValueCount"]),
        projectedOpportunityCount: sum(agencies, ["impact", "projected", "total"]),
        projectedWarningReduction: sum(agencies, ["impact", "projectedReduction", "total"]),
        projectionCompleteAgencyCount: agencies.filter((agency) => agency.impact?.projectionComplete === true).length,
        projectedPageCount: pages.length,
        projectionCompletePageCount: pages.filter((page) => page.projectionComplete === true).length,
        projectionPartialPageCount: pages.filter((page) => page.projectionComplete !== true).length,
        pagesWithProjectedReductionCount: pages.filter((page) => Number(page.projectedReduction || 0) > 0).length,
        fullyResolvedPageCount: pages.filter((page) => Number(page.beforeWarnings || 0) > 0 && Number(page.projectedWarnings || 0) === 0).length,
      },
    };
    const planFingerprint = networkQualityUpliftFingerprint(response);
    const operatorReport = buildQualityUpliftOperatorReport(response);

    return { ...response, planFingerprint, operatorReport };
  };

  Object.defineProperty(ServiceClass.prototype, "__mse2531QualityUpliftPreviewInstalled", { value: true, configurable: false, enumerable: false, writable: false });
  return ServiceClass;
}

module.exports = {
  exactHeroTarget,
  exactInternalLinkSource,
  installQualityUpliftPreview,
  normalizedBlockType,
  projectedPages,
  proposalWithCopyPreview,
  sealInternalLinkOperation,
  sealOperationFinalValue,
  sha256Text,
  siteFromAgencyPlan,
  sum,
};
