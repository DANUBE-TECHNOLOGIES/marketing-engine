"use strict";

const {
  buildLocalSeoQualityUpliftPlan,
} = require("./quality-uplift-planner");
const {
  consolidateQualityUpliftActions,
} = require("./quality-uplift-action-planner");
const {
  buildQualityUpliftProposal,
} = require("./quality-uplift-proposal-planner");

function siteFromAgencyPlan(plan = {}) {
  return {
    slug: plan.siteSlug || null,
    agencyId: plan.agencyId || null,
    agency: {
      id: plan.agencyId || null,
      city: plan.city || null,
    },
    pages: (plan.pages || []).map((item) => ({
      ...(item.page || {}),
      slug: item.slug || item.page?.slug || null,
      title: item.title || item.page?.title || null,
      published: item.published === true || item.page?.published === true,
      blocks: item.currentBlocks || item.page?.blocks || [],
    })),
  };
}

function installQualityUpliftPreview(ServiceClass) {
  if (!ServiceClass || ServiceClass.prototype.__mse2531QualityUpliftPreviewInstalled) {
    return ServiceClass;
  }

  ServiceClass.prototype.previewAgencyQualityUplift = async function previewAgencyQualityUplift(
    { agencyId, minimumWords = 120 } = {}
  ) {
    const agencyPlan = await this.buildAgencyContentOptimization({ agencyId });
    const site = siteFromAgencyPlan(agencyPlan);
    const plan = buildLocalSeoQualityUpliftPlan(site, { minimumWords });
    const actionPlan = consolidateQualityUpliftActions(plan);
    const proposalPlan = buildQualityUpliftProposal(actionPlan);

    return {
      operation: "preview-quality-uplift",
      writes: false,
      destructive: false,
      readOnly: true,
      ...plan,
      actions: actionPlan.actions,
      actionSummary: {
        actionCount: actionPlan.actionCount,
        highPriorityCount: actionPlan.highPriorityCount,
        mediumPriorityCount: actionPlan.mediumPriorityCount,
        lowPriorityCount: actionPlan.lowPriorityCount,
      },
      proposals: proposalPlan.proposals,
      proposalSummary: {
        proposalCount: proposalPlan.proposalCount,
        operationCount: proposalPlan.operationCount,
      },
      excludedPages: agencyPlan.excludedPages || [],
    };
  };

  ServiceClass.prototype.previewNetworkQualityUplift = async function previewNetworkQualityUplift(
    { minimumWords = 120 } = {}
  ) {
    const sites = await this.repository.listSites();
    const publishedSites = (sites || []).filter(
      (site) => String(site?.status || "").toLowerCase() === "published"
    );
    const excludedSites = (sites || [])
      .filter((site) => String(site?.status || "").toLowerCase() !== "published")
      .map((site) => ({
        agencyId: site.agencyId || site.agency?.id || null,
        siteSlug: site.slug || null,
        status: site.status || null,
        reason: "site-not-published",
      }));

    const agencies = [];
    for (const site of publishedSites) {
      const agencyId = site.agencyId || site.agency?.id;
      if (!agencyId) continue;
      agencies.push(
        await this.previewAgencyQualityUplift({ agencyId, minimumWords })
      );
    }

    return {
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
        intentOpportunityCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.summary?.intentOpportunityCount || 0),
          0
        ),
        thinContentOpportunityCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.summary?.thinContentOpportunityCount || 0),
          0
        ),
        internalLinkOpportunityCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.summary?.internalLinkOpportunityCount || 0),
          0
        ),
        totalOpportunityCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.summary?.totalOpportunityCount || 0),
          0
        ),
        pageActionCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.actionSummary?.actionCount || 0),
          0
        ),
        highPriorityPageCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.actionSummary?.highPriorityCount || 0),
          0
        ),
        mediumPriorityPageCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.actionSummary?.mediumPriorityCount || 0),
          0
        ),
        lowPriorityPageCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.actionSummary?.lowPriorityCount || 0),
          0
        ),
        proposalCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.proposalSummary?.proposalCount || 0),
          0
        ),
        proposedOperationCount: agencies.reduce(
          (sum, agency) => sum + Number(agency.proposalSummary?.operationCount || 0),
          0
        ),
      },
    };
  };

  Object.defineProperty(ServiceClass.prototype, "__mse2531QualityUpliftPreviewInstalled", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  return ServiceClass;
}

module.exports = {
  installQualityUpliftPreview,
  siteFromAgencyPlan,
};
