const prisma = require("../core/prisma/client");
const {
  collectVerifiedTeamMembers,
  memberKnowledgeEntityId,
} = require("../modules/minisite-structured-data/person");
const {
  loadKnowledgeSnapshot,
} = require("./knowledge-pilot-readonly");
const {
  buildKnowledgePilotPlan,
} = require("./pilot-planner");
const {
  summarizePlan,
} = require("./maurepas-pilot.service");

function clean(value) {
  return String(value || "").trim();
}

function asTargetCities(value) {
  if (!value) return [];

  const raw = Array.isArray(value)
    ? value
    : Array.isArray(value?.cities)
      ? value.cities
      : [];

  const seen = new Set();
  const result = [];

  for (const entry of raw) {
    const city = clean(typeof entry === "string" ? entry : entry?.name || entry?.city);
    const key = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (!city || seen.has(key)) continue;
    seen.add(key);
    result.push(city);
  }

  return result;
}

function publishedTeamPages(agencySites = []) {
  const pages = [];

  for (const site of agencySites || []) {
    for (const page of site?.pages || []) {
      const pagePublished = page?.published === true || clean(page?.status).toLowerCase() === "published";
      if (!pagePublished) continue;

      pages.push({
        ...page,
        blocks: (page.blocks || []).filter((block) =>
          clean(block?.status).toLowerCase() === "published"
        ),
      });
    }
  }

  return pages;
}

function teamAudit(source) {
  const members = collectVerifiedTeamMembers(publishedTeamPages(source?.agencySites || []));
  const linked = members.filter((member) => memberKnowledgeEntityId(member));

  return {
    explicitMembers: members.length,
    linkedMembers: linked.length,
    unlinkedMembers: members.length - linked.length,
    members: members.map((member) => ({
      name: clean(member?.name || member?.fullName || member?.title),
      knowledgeEntityId: memberKnowledgeEntityId(member) || null,
    })),
  };
}

function buildAgencyManifest(source) {
  const siteSlug = clean(source?.seoSite?.slug);
  const city = clean(source?.seoSite?.seoCity || source?.city);
  const title = clean(source?.name);

  if (!siteSlug || !city || !title) {
    return null;
  }

  return {
    key: `network:${siteSlug}`,
    language: "fr",
    entities: [
      {
        ref: `agency:${siteSlug}`,
        type: "agency",
        slug: `mondescale-${siteSlug}`,
        title,
        status: "published",
        summary: `Agence de voyages Mondescale à ${city}.`,
      },
    ],
    relations: [],
    expertise: [],
  };
}

async function resolveTenantId(tenantSlug = "mondescale", { prismaClient = prisma } = {}) {
  const tenant = await prismaClient.tenant.findUnique({
    where: { slug: clean(tenantSlug) || "mondescale" },
    select: { id: true },
  });

  if (!tenant?.id) {
    const error = new Error(`Tenant introuvable: ${tenantSlug}`);
    error.status = 404;
    error.code = "NETWORK_GEO_TENANT_NOT_FOUND";
    throw error;
  }

  return tenant.id;
}

async function listAgencySources(tenantId, { prismaClient = prisma } = {}) {
  return prismaClient.agency.findMany({
    where: { tenantId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      city: true,
      seoSite: {
        select: {
          id: true,
          slug: true,
          seoCity: true,
          targetCities: true,
          status: true,
        },
      },
      agencySites: {
        select: {
          id: true,
          slug: true,
          status: true,
          pages: {
            select: {
              id: true,
              slug: true,
              status: true,
              published: true,
              blocks: {
                select: {
                  id: true,
                  blockType: true,
                  content: true,
                  status: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ city: "asc" }, { id: "asc" }],
  });
}

async function report({
  tenantSlug = "mondescale",
  tenantId,
  sourceLoader = listAgencySources,
  snapshotLoader = loadKnowledgeSnapshot,
  tenantResolver = resolveTenantId,
} = {}) {
  const resolvedTenantId = tenantId || await tenantResolver(tenantSlug);
  const sources = await sourceLoader(resolvedTenantId);
  const agencies = [];
  const blocked = [];

  for (const source of sources || []) {
    const manifest = buildAgencyManifest(source);
    const audit = teamAudit(source);
    const targetCities = asTargetCities(source?.seoSite?.targetCities);

    if (!manifest) {
      blocked.push({
        agencyId: source?.id || null,
        agencyName: clean(source?.name) || null,
        city: clean(source?.city) || null,
        reason: "canonical_seo_site_missing_or_incomplete",
        team: audit,
      });
      continue;
    }

    const snapshot = await snapshotLoader(manifest);
    const plan = buildKnowledgePilotPlan({
      manifest,
      existingEntities: snapshot.existingEntities,
      existingRelations: snapshot.existingRelations,
    });

    agencies.push({
      agencyId: source.id,
      agencyName: source.name,
      siteSlug: source.seoSite.slug,
      seoCity: source.seoSite.seoCity,
      targetCities,
      sourceStatus: source.seoSite.status,
      mode: "read-only",
      writes: false,
      destructive: false,
      expertiseValidated: 0,
      expertInPlanned: false,
      team: audit,
      summary: summarizePlan(plan),
      actions: plan.actions,
    });
  }

  const totals = agencies.reduce(
    (acc, agency) => {
      acc.actionable += agency.summary.actionable;
      acc.noop += agency.summary.noop;
      acc.explicitMembers += agency.team.explicitMembers;
      acc.linkedMembers += agency.team.linkedMembers;
      acc.unlinkedMembers += agency.team.unlinkedMembers;
      return acc;
    },
    { actionable: 0, noop: 0, explicitMembers: 0, linkedMembers: 0, unlinkedMembers: 0 }
  );

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    tenantId: resolvedTenantId,
    tenantSlug,
    summary: {
      sourceAgencyCount: (sources || []).length,
      eligibleAgencyCount: agencies.length,
      blockedAgencyCount: blocked.length,
      ...totals,
    },
    agencies,
    blocked,
  };
}

module.exports = {
  asTargetCities,
  buildAgencyManifest,
  listAgencySources,
  publishedTeamPages,
  report,
  resolveTenantId,
  teamAudit,
};
