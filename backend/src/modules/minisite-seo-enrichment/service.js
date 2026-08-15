"use strict";

const { buildSeoPlan } = require("./planner");
const { MiniSiteSeoRepository } = require("./repository");
const { applyOptimizedSeoItems } = require("./optimizer-executor");

class MiniSiteSeoEnrichmentService {
  constructor({ prisma, repository, publicOrigin } = {}) {
    this.repository = repository || new MiniSiteSeoRepository(prisma);
    this.publicOrigin = publicOrigin || "https://agences.mondescale.com";
  }

  health() {
    return {
      status: "ok",
      capability: "minisite-seo-enrichment",
      persistence: true,
      deterministic: true,
      operations: ["previewNetwork", "previewAgency", "applyAgency", "previewAgencyOptimization", "optimizeAgency", "normalizeAgencyTitles"],
    };
  }

  async requireAgencySite(agencyId) {
    if (agencyId === undefined || agencyId === null || agencyId === "") {
      const error = new Error("agencyId est obligatoire.");
      error.code = "MINISITE_SEO_AGENCY_ID_REQUIRED";
      error.status = 400;
      throw error;
    }
    const site = await this.repository.findSiteByAgency(agencyId);
    if (!site) {
      const error = new Error("Mini-site introuvable pour cette agence.");
      error.code = "MINISITE_SEO_SITE_NOT_FOUND";
      error.status = 404;
      throw error;
    }
    return site;
  }

  async previewAgency({ agencyId } = {}) {
    const site = await this.requireAgencySite(agencyId);
    return buildSeoPlan({ sites: [site], publicOrigin: this.publicOrigin, optimizeExisting: false });
  }

  async previewAgencyOptimization({ agencyId } = {}) {
    const site = await this.requireAgencySite(agencyId);
    return buildSeoPlan({ sites: [site], publicOrigin: this.publicOrigin, optimizeExisting: true });
  }

  async applyAgency({ agencyId, dryRun = true, confirm = false } = {}) {
    if (dryRun === false && confirm !== true) {
      const error = new Error("Une confirmation explicite est obligatoire.");
      error.code = "MINISITE_SEO_CONFIRMATION_REQUIRED";
      error.status = 400;
      throw error;
    }
    const plan = await this.previewAgency({ agencyId });
    const execution = await this.repository.applySeoItems({ items: plan.items, dryRun: dryRun !== false });
    return { operation: dryRun === false ? "apply" : "preview-apply", destructive: false, overwrite: false, agencyId, planSummary: plan.summary, execution };
  }

  async optimizeAgency({ agencyId, dryRun = true, confirm = false } = {}) {
    if (dryRun === false && confirm !== true) {
      const error = new Error("Une confirmation explicite est obligatoire pour optimiser les métadonnées existantes.");
      error.code = "MINISITE_SEO_OPTIMIZATION_CONFIRMATION_REQUIRED";
      error.status = 400;
      throw error;
    }
    const plan = await this.previewAgencyOptimization({ agencyId });
    const execution = await applyOptimizedSeoItems(this.repository, { items: plan.items, dryRun: dryRun !== false });
    return { operation: dryRun === false ? "optimize" : "preview-optimize", destructive: false, overwrite: true, agencyId, planSummary: plan.summary, execution };
  }

  async normalizeAgencyTitles({ agencyId, limit = 65, dryRun = true, confirm = false } = {}) {
    if (dryRun === false && confirm !== true) {
      const error = new Error("Une confirmation explicite est obligatoire.");
      error.code = "MINISITE_SEO_CONFIRMATION_REQUIRED";
      error.status = 400;
      throw error;
    }
    return this.repository.normalizeLongSeoTitles({ agencyId, limit, dryRun: dryRun !== false });
  }

  async previewNetwork() {
    const sites = await this.repository.listSites();
    return buildSeoPlan({ sites, publicOrigin: this.publicOrigin, optimizeExisting: false });
  }
}

module.exports = { MiniSiteSeoEnrichmentService };
