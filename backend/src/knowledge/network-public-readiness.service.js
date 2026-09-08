const prisma = require("../core/prisma/client");
const {
  MiniSiteStructuredDataService,
  publicStructuredDataSite,
} = require("../modules/minisite-structured-data/service");
const {
  MiniSiteStructuredDataRepository,
} = require("../modules/minisite-structured-data/repository");
const {
  buildStructuredDataPlan,
} = require("../modules/minisite-structured-data/planner");
const {
  MONDESCALE_ORGANIZATION_ID,
} = require("../modules/minisite-structured-data/travel-agency");
const {
  collectKnowledgeEntityIds,
  collectVerifiedTeamMembers,
} = require("../modules/minisite-structured-data/person");
const networkGeo = require("./network-geo.service");

function types(node) {
  return Array.isArray(node?.["@type"])
    ? node["@type"]
    : node?.["@type"]
      ? [node["@type"]]
      : [];
}

function hasType(node, type) {
  return types(node).includes(type);
}

function areaServedNames(agencyNode) {
  const area = Array.isArray(agencyNode?.areaServed)
    ? agencyNode.areaServed
    : agencyNode?.areaServed
      ? [agencyNode.areaServed]
      : [];
  return area
    .map((item) => String(item?.name || "").trim())
    .filter(Boolean);
}

function statusFor(issues) {
  const critical = new Set([
    "invalid_structured_data_graph",
    "canonical_organization_missing",
    "travel_agency_missing",
    "travel_agency_parent_mismatch",
  ]);
  if (issues.some((issue) => critical.has(issue.code))) return "blocked";
  if (issues.length) return "partial";
  return "ready";
}

function scoreFor(issues) {
  const penalties = {
    invalid_structured_data_graph: 35,
    canonical_organization_missing: 25,
    travel_agency_missing: 35,
    travel_agency_parent_mismatch: 20,
    area_served_missing: 15,
    person_works_for_mismatch: 15,
    team_knowledge_link_incomplete: 10,
  };
  return Math.max(
    0,
    100 - issues.reduce((total, issue) => total + (penalties[issue.code] || 5), 0)
  );
}

function auditItem(item, site) {
  const graph = item?.graph?.["@graph"] || [];
  const issues = [];
  const organization = graph.find(
    (node) => hasType(node, "Organization") && node?.["@id"] === MONDESCALE_ORGANIZATION_ID
  );
  const agency = graph.find((node) => hasType(node, "TravelAgency"));
  const people = graph.filter((node) => hasType(node, "Person"));
  const agencyId = agency?.["@id"] || null;
  const areaNames = areaServedNames(agency);
  const explicitTeamMembers = collectVerifiedTeamMembers(site?.pages || []);
  const explicitKnowledgeIds = collectKnowledgeEntityIds(site?.pages || []);
  const publishedKnowledgeIds = new Set(
    (site?.knowledgePeople || []).map((entity) => String(entity?.id || "")).filter(Boolean)
  );
  const linkedKnowledgeIds = explicitKnowledgeIds.filter((id) => publishedKnowledgeIds.has(String(id)));

  if (item?.validation?.valid !== true) {
    issues.push({ code: "invalid_structured_data_graph", message: "Le graphe structured-data n'est pas valide." });
  }
  if (!organization) {
    issues.push({ code: "canonical_organization_missing", message: "L'Organization Mondescale canonique est absente." });
  }
  if (!agency) {
    issues.push({ code: "travel_agency_missing", message: "Le nœud TravelAgency est absent." });
  } else {
    if (agency?.parentOrganization?.["@id"] !== MONDESCALE_ORGANIZATION_ID) {
      issues.push({ code: "travel_agency_parent_mismatch", message: "La TravelAgency ne pointe pas vers l'Organization canonique." });
    }
    if (!areaNames.length) {
      issues.push({ code: "area_served_missing", message: "Aucune zone areaServed explicite n'est publiée." });
    }
  }

  const invalidWorksFor = people.filter((person) => person?.worksFor?.["@id"] !== agencyId);
  if (invalidWorksFor.length) {
    issues.push({
      code: "person_works_for_mismatch",
      message: `${invalidWorksFor.length} Person ne pointe(nt) pas vers la TravelAgency canonique.`,
    });
  }

  if (explicitTeamMembers.length > linkedKnowledgeIds.length) {
    issues.push({
      code: "team_knowledge_link_incomplete",
      message: `${explicitTeamMembers.length - linkedKnowledgeIds.length} profil(s) équipe restent sans liaison Knowledge publiée.`,
    });
  }

  const knowsAboutCount = people.reduce(
    (total, person) => total + (Array.isArray(person?.knowsAbout) ? person.knowsAbout.length : person?.knowsAbout ? 1 : 0),
    0
  );

  const status = statusFor(issues);
  return {
    agencyId: item?.agencyId || null,
    agencyName: item?.agencyName || null,
    siteSlug: item?.siteSlug || site?.slug || null,
    status,
    score: scoreFor(issues),
    validation: item?.validation || null,
    metrics: {
      graphNodeCount: graph.length,
      areaServedCount: areaNames.length,
      areaServed: areaNames,
      publicPersonCount: people.length,
      explicitTeamMemberCount: explicitTeamMembers.length,
      knowledgeLinkedPersonCount: linkedKnowledgeIds.length,
      knowsAboutCount,
    },
    issues,
  };
}

async function report({
  tenantSlug = "mondescale",
  tenantId,
  tenantResolver = networkGeo.resolveTenantId,
  prismaClient = prisma,
  repository,
  structuredDataService,
  publicOrigin,
} = {}) {
  const resolvedTenantId = tenantId || await tenantResolver(tenantSlug);
  const repo = repository || new MiniSiteStructuredDataRepository(prismaClient);
  const service = structuredDataService || new MiniSiteStructuredDataService({
    prisma: prismaClient,
    repository: repo,
    publicOrigin,
  });

  const allSites = await repo.listSites(resolvedTenantId);
  const publicSites = (allSites || []).map(publicStructuredDataSite).filter(Boolean);
  const enrichedSites = await service.enrichSitesWithKnowledge(publicSites);
  const plan = buildStructuredDataPlan({
    sites: enrichedSites,
    publicOrigin: service.publicOrigin,
  });
  const sitesBySlug = new Map(enrichedSites.map((site) => [String(site.slug), site]));
  const agencies = (plan.items || []).map((item) => auditItem(item, sitesBySlug.get(String(item.siteSlug))));

  const summary = {
    publishedSiteCount: agencies.length,
    readyCount: agencies.filter((item) => item.status === "ready").length,
    partialCount: agencies.filter((item) => item.status === "partial").length,
    blockedCount: agencies.filter((item) => item.status === "blocked").length,
    averageScore: agencies.length
      ? Math.round(agencies.reduce((total, item) => total + item.score, 0) / agencies.length)
      : 0,
    publicPersonCount: agencies.reduce((total, item) => total + item.metrics.publicPersonCount, 0),
    knowledgeLinkedPersonCount: agencies.reduce((total, item) => total + item.metrics.knowledgeLinkedPersonCount, 0),
    areaServedCount: agencies.reduce((total, item) => total + item.metrics.areaServedCount, 0),
    knowsAboutCount: agencies.reduce((total, item) => total + item.metrics.knowsAboutCount, 0),
  };

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    tenantId: resolvedTenantId,
    tenantSlug,
    publicOrigin: service.publicOrigin,
    summary,
    agencies,
  };
}

module.exports = {
  areaServedNames,
  auditItem,
  hasType,
  report,
  scoreFor,
  statusFor,
  types,
};
