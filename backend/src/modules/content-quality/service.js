const { ContentQualityRepository } = require("./repository");
const { analyzeAgainstCandidates } = require("./analyzer");

class ContentQualityService {
  constructor(prisma) { this.repository = new ContentQualityRepository(prisma); }

  async checkPage(pageId, options = {}) {
    const source = await this.repository.getPage(pageId);
    if (!source) {
      const error = new Error("Page introuvable");
      error.status = 404;
      throw error;
    }
    const scope = options.scope === "portfolio" ? "portfolio" : "site";
    const candidates = await this.repository.listPages({ siteId: source.siteId, excludeId: source.id, scope });
    return { page: source, scope, ...analyzeAgainstCandidates(source, candidates, options) };
  }

  async checkDraft(draft, options = {}) {
    if (!draft || !draft.title || !draft.slug) {
      const error = new Error("title et slug sont obligatoires");
      error.status = 400;
      throw error;
    }
    let siteId = draft.siteId;
    if (!siteId && draft.siteSlug) {
      const site = await this.repository.getSite(draft.siteSlug);
      siteId = site?.id;
    }
    if (!siteId && options.scope !== "portfolio") {
      const error = new Error("siteId ou siteSlug est obligatoire pour une analyse de site");
      error.status = 400;
      throw error;
    }
    const source = {
      id: draft.id || null,
      siteId: siteId || null,
      title: draft.title,
      slug: draft.slug,
      path: draft.path || "",
      h1: draft.h1 || draft.title,
      metaDescription: draft.metaDescription || "",
      status: draft.status || "draft",
      content: draft.content || ""
    };
    const scope = options.scope === "portfolio" ? "portfolio" : "site";
    const candidates = await this.repository.listPages({ siteId, excludeId: source.id, scope });
    return { draft: source, scope, ...analyzeAgainstCandidates(source, candidates, options) };
  }

  async checkSite(siteIdOrSlug, options = {}) {
    const site = await this.repository.getSite(siteIdOrSlug);
    if (!site) {
      const error = new Error("Mini-site introuvable");
      error.status = 404;
      throw error;
    }
    const pages = await this.repository.listPages({ siteId: site.id, scope: "site" });
    const reports = pages.map((page) => ({ page, ...analyzeAgainstCandidates(page, pages, options) }));
    const pairs = new Map();
    for (const report of reports) {
      for (const similar of report.similarPages) {
        const key = [report.page.id, similar.page.id].sort().join(":");
        if (!pairs.has(key)) pairs.set(key, { source: report.page, ...similar });
      }
    }
    const conflicts = [...pairs.values()].sort((a, b) => b.cannibalizationRisk - a.cannibalizationRisk);
    return {
      site: { id: site.id, slug: site.slug, name: site.name },
      summary: {
        pages: pages.length,
        conflicts: conflicts.length,
        critical: conflicts.filter((item) => item.duplicateRisk >= 0.82).length,
        cannibalization: conflicts.filter((item) => item.cannibalizationRisk >= 0.72).length
      },
      conflicts,
      pages: reports
    };
  }

  async checkCluster(payload = {}) {
    const drafts = Array.isArray(payload.pages) ? payload.pages : [];
    if (!drafts.length) {
      const error = new Error("pages doit contenir au moins une page");
      error.status = 400;
      throw error;
    }
    const options = { scope: payload.scope, duplicateThreshold: payload.duplicateThreshold };
    const reports = [];
    for (const draft of drafts) reports.push(await this.checkDraft({ ...draft, siteId: draft.siteId || payload.siteId, siteSlug: draft.siteSlug || payload.siteSlug }, options));
    return {
      summary: {
        pages: reports.length,
        create: reports.filter((item) => item.recommendedAction === "create").length,
        differentiate: reports.filter((item) => item.recommendedAction === "differentiate").length,
        updateExisting: reports.filter((item) => item.recommendedAction === "update_existing").length,
        merge: reports.filter((item) => item.recommendedAction === "merge").length
      },
      reports
    };
  }
}

module.exports = ContentQualityService;
