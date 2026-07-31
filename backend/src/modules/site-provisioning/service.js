"use strict";

const AgencySiteService = require("../agency-site/service");
const SiteProvisioningRepository = require("./repository");
const { pageBlocks } = require("./templates");

function normalizeIds(value) {
  if (value == null) return null;
  if (!Array.isArray(value)) throw Object.assign(new Error("agencyIds doit être une liste."), { statusCode: 400, code: "INVALID_AGENCY_IDS" });
  const ids = [...new Set(value.map(Number))];
  if (ids.some(id => !Number.isInteger(id) || id <= 0)) throw Object.assign(new Error("agencyIds contient un identifiant invalide."), { statusCode: 400, code: "INVALID_AGENCY_IDS" });
  return ids;
}

class SiteProvisioningService {
  constructor(prismaOrRepo, tenantId, siteService = null) {
    this.repo = prismaOrRepo?.listAgencies ? prismaOrRepo : new SiteProvisioningRepository(prismaOrRepo, tenantId);
    this.siteService = siteService || new AgencySiteService(prismaOrRepo, tenantId);
  }

  health() {
    return { ok: true, version: "14.2.0", capability: "mini-site-auto-provisioning" };
  }

  async status() {
    const agencies = await this.repo.listAgencies();
    const rows = agencies.map(a => ({
      agencyId: a.id,
      agencyName: a.name,
      city: a.city,
      provisioned: a.agencySites.length > 0,
      site: a.agencySites[0] || null,
    }));
    return {
      totalAgencies: rows.length,
      provisioned: rows.filter(x => x.provisioned).length,
      missing: rows.filter(x => !x.provisioned).length,
      agencies: rows,
    };
  }

  async seedBlocks(site, agency) {
    let created = 0;
    let skipped = 0;
    for (const page of site.pages || []) {
      const blocks = pageBlocks({ ...page, siteBasePath: site.basePath }, agency);
      for (const block of blocks) {
        const exists = await this.repo.findBlock(page.id, block.name);
        if (exists) { skipped += 1; continue; }
        await this.repo.createBlock(page.id, block);
        created += 1;
      }
    }
    return { created, skipped };
  }

  async provisionAgency(agencyId, options = {}) {
    const agency = await this.repo.getAgency(agencyId);
    if (!agency) throw Object.assign(new Error(`Agence ${agencyId} introuvable pour ce tenant.`), { statusCode: 404, code: "AGENCY_NOT_FOUND" });

    let site = await this.repo.getSiteByAgencyId(agency.id);
    const alreadyProvisioned = Boolean(site);
    if (!site) {
      await this.siteService.generate(agency.id, options.slug ? { slug: options.slug } : {});
      site = await this.repo.getSiteByAgencyId(agency.id);
    }
    if (!site) throw Object.assign(new Error(`Le mini-site de l'agence ${agency.id} n'a pas pu être créé.`), { statusCode: 500, code: "SITE_PROVISIONING_FAILED" });

    const blocks = options.seedBlocks === false ? { created: 0, skipped: 0 } : await this.seedBlocks(site, agency);
    return {
      agencyId: agency.id,
      agencyName: agency.name,
      alreadyProvisioned,
      siteId: site.id,
      siteSlug: site.slug,
      pageCount: site.pages?.length || 0,
      blocks,
    };
  }

  async provisionBatch(input = {}) {
    const agencyIds = normalizeIds(input.agencyIds);
    const agencies = await this.repo.listAgencies(agencyIds);
    const dryRun = input.dryRun === true;
    const missingOnly = input.missingOnly !== false;
    const selected = missingOnly ? agencies.filter(a => a.agencySites.length === 0) : agencies;

    if (dryRun) {
      return {
        dryRun: true,
        selected: selected.length,
        agencies: selected.map(a => ({ agencyId: a.id, agencyName: a.name, alreadyProvisioned: a.agencySites.length > 0 })),
      };
    }

    const results = [];
    for (const agency of selected) {
      try {
        results.push({ ok: true, ...(await this.provisionAgency(agency.id, { seedBlocks: input.seedBlocks !== false })) });
      } catch (error) {
        results.push({ ok: false, agencyId: agency.id, agencyName: agency.name, error: error.message, code: error.code || "PROVISIONING_ERROR" });
      }
    }
    return {
      dryRun: false,
      selected: selected.length,
      succeeded: results.filter(x => x.ok).length,
      failed: results.filter(x => !x.ok).length,
      results,
    };
  }
}

module.exports = { SiteProvisioningService, normalizeIds };
