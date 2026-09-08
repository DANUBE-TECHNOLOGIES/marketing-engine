"use strict";

const { buildEntityFacts } = require("./entity-facts");
const { buildStructuredDataPlan } = require("./planner");
const { publicStructuredDataSite } = require("./service");

function clean(value) {
  return String(value || "").trim();
}

function sortBySiteSlug(items = []) {
  return [...items].sort((a, b) =>
    String(a?.siteSlug || "").localeCompare(String(b?.siteSlug || ""), "fr")
  );
}

async function buildNetworkEntityFacts({
  service,
  tenantId,
  siteSlug,
} = {}) {
  if (!service?.repository || typeof service.repository.listSites !== "function") {
    const error = new Error("Repository mini-site indisponible pour la projection réseau.");
    error.code = "MINISITE_NETWORK_ENTITY_FACTS_REPOSITORY_REQUIRED";
    error.status = 500;
    throw error;
  }

  const requestedSlug = clean(siteSlug);
  const sites = await service.repository.listSites(tenantId);
  const publicSites = (sites || [])
    .map(publicStructuredDataSite)
    .filter(Boolean)
    .filter((site) => !requestedSlug || clean(site.slug) === requestedSlug);

  if (requestedSlug && !publicSites.length) {
    const error = new Error(`Mini-site public introuvable : ${requestedSlug}`);
    error.code = "MINISITE_NETWORK_ENTITY_FACTS_SITE_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  const enrichedSites = await service.enrichSitesWithKnowledge(publicSites);
  const plan = buildStructuredDataPlan({
    sites: enrichedSites,
    publicOrigin: service.publicOrigin,
  });

  const validItems = (plan.items || []).filter((item) => item?.validation?.valid === true);
  const invalidItems = (plan.items || []).filter((item) => item?.validation?.valid !== true);

  const entities = sortBySiteSlug(
    validItems.map((item) =>
      buildEntityFacts({
        version: plan.version,
        publicOrigin: plan.publicOrigin,
        siteSlug: item.siteSlug,
        agencyId: item.agencyId,
        agencyName: item.agencyName,
        validation: item.validation,
        summary: item.summary,
        graph: item.graph,
      })
    )
  );

  return {
    version: "1.0.0",
    tenantScoped: true,
    siteSlug: requestedSlug || null,
    summary: {
      publicSiteCount: publicSites.length,
      servedEntityCount: entities.length,
      excludedInvalidSiteCount: invalidItems.length,
    },
    entities,
    provenance: {
      source: "canonical-structured-data-graph",
      projection: "network-entity-facts",
      graphVersion: plan.version,
      factsOnly: true,
      inference: false,
      providerCall: false,
      reviewsIncluded: false,
      rankingIncluded: false,
    },
  };
}

module.exports = {
  buildNetworkEntityFacts,
  clean,
  sortBySiteSlug,
};
