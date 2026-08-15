"use strict";

const { buildStructuredDataPlan } = require("./planner");
const { buildPublicSitemap, isPublishedPage, isPublishedSite } = require("./sitemap");
const { applyInspirationIndexabilityContract } = require("./inspiration-indexability");
const { applyContentQualityIndexabilityContract } = require("./content-quality-indexability");
const { auditSitemapCrawlability } = require("./crawlability-audit");
const { attachIndexationReadiness } = require("./indexation-readiness");
const { attachLocalSeoReadiness } = require("./local-seo-readiness");
const { attachLocalContentReadiness } = require("./local-content-readiness");
const { attachLocalSemanticReadiness } = require("./local-semantic-readiness");
const { attachLocalSearchIntentReadiness } = require("./local-search-intent-readiness");
const { attachLocalIntentTargetReadiness } = require("./local-intent-target-readiness");
const { auditLocalIntentTargetMapping } = require("./local-intent-target-mapping");
const { entriesForSite, renderSitemapXml } = require("./sitemap-xml");
const { auditLocalSeoCoverage } = require("./local-seo-coverage");
const { auditLocalContentUniqueness } = require("./local-content-uniqueness");
const { MiniSiteStructuredDataRepository } = require("./repository");

function normalizePublicOrigin(value) { return String(value || process.env.PUBLIC_SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://agences.mondescale.com").trim().replace(/\/+$/g, ""); }
function isPublishedBlock(block) { if (!block) return false; if (block.published === true || block.isPublished === true) return true; return String(block.status || "").trim().toLowerCase() === "published"; }
function publicStructuredDataSite(site) { if (!isPublishedSite(site)) return null; return { ...site, pages: (site.pages || []).filter(isPublishedPage).map((page) => ({ ...page, blocks: (page.blocks || []).filter(isPublishedBlock) })) }; }

class MiniSiteStructuredDataService {
  constructor({ prisma, repository, publicOrigin } = {}) { this.repository = repository || new MiniSiteStructuredDataRepository(prisma); this.publicOrigin = normalizePublicOrigin(publicOrigin); }
  health() { return { status: "ok", capability: "minisite-structured-data", persistence: false, destructive: false, deterministic: true, tenantScoped: true, publicGraphPublishedOnly: true, destinationSitemap: "localized-per-published-agency-site", editorialSitemap: "canonical-agency-only", inspirationIndexSitemap: "only-when-public-content-targets-agency", contentQualityIndexability: "critically-thin-nonfunctional-pages-excluded", crawlabilityAudit: "discovery-source-and-orphan-detection", indexationReadiness: "technical-local-seo-content-uniqueness-semantic-depth-search-intent-and-concrete-target-safe-to-submit-report", localSeoCoverage: "published-content-h1-nap-structured-data-linking-geographic-semantic-depth-and-search-intent-audit", localIntentTargetMapping: "same-page-city-and-commercial-intent-mapping", localContentUniqueness: "cross-agency-published-homepage-similarity-audit", xmlSitemap: "network-and-site-candidate-rendering", publicOrigin: this.publicOrigin, schemas: ["TravelAgency", "LocalBusiness", "WebSite", "WebPage", "BreadcrumbList", "FAQPage"], operations: ["previewNetwork", "previewSitemap", "previewSite", "networkSitemapXml", "siteSitemapCandidate", "localSeoCoverage", "localIntentTargetMapping", "localContentUniqueness"] }; }
  async previewSite({ siteSlug, tenantId } = {}) { const site = await this.repository.findSiteBySlug(siteSlug, tenantId); const publicSite = publicStructuredDataSite(site); if (!publicSite) { const error = new Error(`Mini-site public introuvable : ${siteSlug}`); error.code = "MINISITE_STRUCTURED_DATA_SITE_NOT_FOUND"; error.status = 404; throw error; } const plan = buildStructuredDataPlan({ sites: [publicSite], publicOrigin: this.publicOrigin }); const item = plan.items[0]; return { version: plan.version, publicOrigin: plan.publicOrigin, siteSlug: item.siteSlug, agencyId: item.agencyId, agencyName: item.agencyName, validation: item.validation, summary: item.summary, graph: item.graph }; }
  async previewSitemap({ tenantId } = {}) {
    const [sites, inspirations, destinations] = await Promise.all([this.repository.listSites(tenantId), this.repository.listPublishedEditorialContents(tenantId), this.repository.listPublishedDestinations(tenantId)]);
    const publicSites = sites.map(publicStructuredDataSite).filter(Boolean);
    const sitemap = buildPublicSitemap({ sites, inspirations, destinations, publicOrigin: this.publicOrigin });
    const technical = attachIndexationReadiness(auditSitemapCrawlability(applyContentQualityIndexabilityContract(applyInspirationIndexabilityContract(sitemap, sites, inspirations), sites)));
    const coverage = auditLocalSeoCoverage(publicSites, {}, { publicOrigin: this.publicOrigin });
    const localReady = attachLocalSeoReadiness(technical, coverage);
    const semanticReady = attachLocalSemanticReadiness(localReady, coverage);
    const intentReady = attachLocalSearchIntentReadiness(semanticReady, coverage);
    const mappings = publicSites.map((site) => ({ siteSlug: site.slug, ...auditLocalIntentTargetMapping(site) }));
    const targetReady = attachLocalIntentTargetReadiness(intentReady, mappings);
    const uniqueness = auditLocalContentUniqueness(publicSites);
    return attachLocalContentReadiness(targetReady, uniqueness);
  }
  async networkSitemapXml({ tenantId } = {}) { const sitemap = await this.previewSitemap({ tenantId }); return { sitemap, xml: renderSitemapXml(sitemap.entries || []) }; }
  async siteSitemapCandidate({ siteSlug, tenantId } = {}) { const slug = String(siteSlug || "").trim(); const sitemap = await this.previewSitemap({ tenantId }); const readiness = (sitemap?.indexationReadiness?.sites || []).find((item) => String(item?.siteSlug || "").trim() === slug); if (!readiness) { const error = new Error(`Mini-site publié introuvable pour l’indexation : ${slug}`); error.code = "MINISITE_INDEXATION_SITE_NOT_FOUND"; error.status = 404; throw error; } const entries = entriesForSite(sitemap, slug); return { siteSlug: slug, readyToSubmit: readiness.readyToSubmit === true, readiness, entryCount: entries.length, entries, xml: readiness.readyToSubmit === true ? renderSitemapXml(entries) : null }; }
  async localSeoCoverage({ tenantId, contexts = {} } = {}) { const sites = (await this.repository.listSites(tenantId)).map(publicStructuredDataSite).filter(Boolean); return auditLocalSeoCoverage(sites, contexts, { publicOrigin: this.publicOrigin }); }
  async localIntentTargetMapping({ tenantId } = {}) { const sites = (await this.repository.listSites(tenantId)).map(publicStructuredDataSite).filter(Boolean); const items = sites.map((site) => ({ siteSlug: site.slug, agencyName: site.agency?.name || null, ...auditLocalIntentTargetMapping(site) })); return { version: "mse-25.28", summary: { siteCount: items.length, strong: items.filter((item) => item.status === "strong").length, coreMapped: items.filter((item) => item.coreIntentMapped).length, diffuse: items.filter((item) => item.diffuseIntents.length > 0).length }, sites: items }; }
  async localContentUniqueness({ tenantId } = {}) { const sites = (await this.repository.listSites(tenantId)).map(publicStructuredDataSite).filter(Boolean); return auditLocalContentUniqueness(sites); }
  async previewNetwork({ tenantId } = {}) { const sites = await this.repository.listSites(tenantId); return buildStructuredDataPlan({ sites, publicOrigin: this.publicOrigin }); }
}

module.exports = { MiniSiteStructuredDataService, normalizePublicOrigin, isPublishedBlock, publicStructuredDataSite };
