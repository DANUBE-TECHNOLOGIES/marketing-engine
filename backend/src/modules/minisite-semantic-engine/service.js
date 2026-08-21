"use strict";

const { MiniSiteSeoRepository } = require("../minisite-seo-enrichment/repository");
const { MiniSiteSeoEnrichmentService } = require("../minisite-seo-enrichment/service");
const PageBuilderPersistenceService = require("../page-builder-persistence/service");
const { fingerprint, networkSemanticPlan, semanticPlan } = require("./engine");
const { buildSemanticProposals } = require("./semantic-proposals");

function attachSemanticProposals(plan = {}) {
  const semanticProposals = buildSemanticProposals(plan);
  const { planFingerprint: _oldFingerprint, ...base } = plan;
  const result = {
    ...base,
    semanticProposals,
    summary: {
      ...(plan.summary || {}),
      semanticProposalCount: semanticProposals.summary.proposalCount,
      existingPageProposalCount: semanticProposals.summary.existingPageProposalCount,
      managedRouteReviewCount: semanticProposals.summary.managedRouteReviewCount || 0,
      newPageEvidenceGateCount: semanticProposals.summary.newPageEvidenceGateCount,
      automaticWriteCount: 0,
    },
  };
  return { ...result, planFingerprint: fingerprint(result) };
}

function managedRoutePages(summary = {}, excludedPages = []) {
  const managedSlugs = new Set(
    (excludedPages || [])
      .filter((row) => row?.reason === "canonical-route-managed")
      .map((row) => String(row.slug || ""))
      .filter(Boolean)
  );

  return (summary.pages || [])
    .filter((page) => managedSlugs.has(String(page.slug || "")))
    .map((page) => ({
      ...page,
      id: page.id || null,
      slug: page.slug || null,
      title: page.title || null,
      published: page.published === true || String(page.status || "").toLowerCase() === "published",
      status: page.status || (page.published === true ? "published" : null),
      blocks: [],
      managedRoute: true,
      writeEligible: false,
      semanticSource: "canonical-managed-route",
    }));
}

class MiniSiteSemanticEngineService {
  constructor({ prisma, repository, enrichmentService } = {}) {
    this.prisma = prisma || null;
    this.repository = repository || new MiniSiteSeoRepository(prisma);
    this.enrichmentService = enrichmentService || null;
  }

  health() {
    return {
      status: "ok",
      version: "mse-25.40",
      capability: "local-seo-semantic-engine",
      readOnly: true,
      writes: false,
      destructive: false,
      doorwayGuard: true,
      locationExpansion: false,
      preferExistingPages: true,
      newPageEvidenceGate: true,
      managedRoutesAware: true,
      autoCreatePages: false,
      automaticWrites: false,
      tenantScoped: true,
      routes: ["agency-preview", "network-preview"],
    };
  }

  async resolveTenantBySlug(tenantSlug) {
    const slug = String(tenantSlug || "").trim();
    if (!slug || !this.prisma?.tenant) return null;
    return this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });
  }

  async resolveTenantId(summary) {
    if (summary?.tenantId) return summary.tenantId;
    if (!this.prisma || !summary?.id) return null;
    const row = await this.prisma.agencySite.findUnique({
      where: { id: summary.id },
      select: { tenantId: true },
    });
    return row?.tenantId || null;
  }

  async assertTenantScope(summary, tenantSlug) {
    if (!tenantSlug) return null;
    const tenant = await this.resolveTenantBySlug(tenantSlug);
    if (!tenant) {
      const error = new Error(`Tenant ${tenantSlug} introuvable.`);
      error.code = "MSE_25_40_TENANT_NOT_FOUND";
      error.status = 404;
      throw error;
    }
    const siteTenantId = await this.resolveTenantId(summary);
    if (!siteTenantId || siteTenantId !== tenant.id) {
      const error = new Error("Le mini-site demandé n'appartient pas au tenant MSE-25.40 courant.");
      error.code = "MSE_25_40_TENANT_SCOPE_MISMATCH";
      error.status = 404;
      throw error;
    }
    return tenant;
  }

  async filterSitesForTenant(sites, tenantSlug) {
    if (!tenantSlug) return sites || [];
    const tenant = await this.resolveTenantBySlug(tenantSlug);
    if (!tenant) {
      const error = new Error(`Tenant ${tenantSlug} introuvable.`);
      error.code = "MSE_25_40_TENANT_NOT_FOUND";
      error.status = 404;
      throw error;
    }
    const rows = await this.prisma.agencySite.findMany({
      where: { tenantId: tenant.id },
      select: { id: true },
    });
    const allowed = new Set(rows.map((row) => String(row.id)));
    return (sites || []).filter((site) => allowed.has(String(site.id)));
  }

  async contentServiceForSite(summary) {
    if (this.enrichmentService) return this.enrichmentService;
    const tenantId = await this.resolveTenantId(summary);
    if (!tenantId) {
      const error = new Error("tenantId introuvable pour le mini-site MSE-25.40.");
      error.code = "MSE_25_40_TENANT_ID_REQUIRED";
      error.status = 500;
      throw error;
    }
    return new MiniSiteSeoEnrichmentService({
      prisma: this.prisma,
      repository: this.repository,
      pageBuilderPersistenceService: new PageBuilderPersistenceService({
        prisma: this.prisma,
        tenantId,
      }),
    });
  }

  async siteWithContent(agencyId, { tenantSlug } = {}) {
    const summary = await this.repository.findSiteByAgency(agencyId);
    if (!summary) {
      const error = new Error("Mini-site introuvable pour cette agence.");
      error.code = "MSE_25_40_SITE_NOT_FOUND";
      error.status = 404;
      throw error;
    }
    await this.assertTenantScope(summary, tenantSlug);
    const enrichmentService = await this.contentServiceForSite(summary);
    const content = await enrichmentService.buildAgencyContentOptimization({ agencyId });
    const editablePages = (content.pages || []).map((row) => ({
      ...(row.page || {}),
      id: row.pageId || row.page?.id || null,
      slug: row.slug || row.page?.slug || null,
      title: row.title || row.page?.title || null,
      published: row.published === true || row.page?.published === true,
      status: row.page?.status || (row.published === true ? "published" : null),
      blocks: row.currentBlocks || row.page?.blocks || [],
      managedRoute: false,
      writeEligible: true,
      semanticSource: "website-designer",
    }));
    const canonicalManagedPages = managedRoutePages(summary, content.excludedPages || []);

    return {
      ...summary,
      pages: [...editablePages, ...canonicalManagedPages],
      semanticExcludedPages: (content.excludedPages || []).filter((row) => row?.reason !== "canonical-route-managed"),
      semanticManagedRoutes: canonicalManagedPages.map((page) => ({ slug: page.slug, pageId: page.id })),
    };
  }

  async previewAgency({ agencyId, tenantSlug } = {}) {
    if (agencyId === undefined || agencyId === null || agencyId === "") {
      const error = new Error("agencyId est obligatoire.");
      error.code = "MSE_25_40_AGENCY_ID_REQUIRED";
      error.status = 400;
      throw error;
    }
    return attachSemanticProposals(semanticPlan(await this.siteWithContent(agencyId, { tenantSlug })));
  }

  async previewNetwork({ tenantSlug } = {}) {
    const allSites = await this.repository.listSites();
    const sites = await this.filterSitesForTenant(allSites, tenantSlug);
    const hydrated = [];
    for (const site of sites || []) {
      if (!(String(site.status || "").toLowerCase() === "published" || Boolean(site.publishedAt))) {
        hydrated.push({ ...site, pages: [] });
        continue;
      }
      const agencyId = site.agencyId || site.agency?.id;
      if (!agencyId) continue;
      hydrated.push(await this.siteWithContent(agencyId, { tenantSlug }));
    }

    const base = networkSemanticPlan(hydrated);
    const agencies = (base.agencies || []).map(attachSemanticProposals);
    const { planFingerprint: _oldFingerprint, ...networkBase } = base;
    const result = {
      ...networkBase,
      tenantSlug: tenantSlug || null,
      agencies,
      summary: {
        ...(base.summary || {}),
        semanticProposalCount: agencies.reduce((sum, row) => sum + (row.summary.semanticProposalCount || 0), 0),
        existingPageProposalCount: agencies.reduce((sum, row) => sum + (row.summary.existingPageProposalCount || 0), 0),
        managedRouteReviewCount: agencies.reduce((sum, row) => sum + (row.summary.managedRouteReviewCount || 0), 0),
        newPageEvidenceGateCount: agencies.reduce((sum, row) => sum + (row.summary.newPageEvidenceGateCount || 0), 0),
        automaticWriteCount: 0,
      },
    };
    return { ...result, planFingerprint: fingerprint(result) };
  }
}

module.exports = { MiniSiteSemanticEngineService, attachSemanticProposals, managedRoutePages };
