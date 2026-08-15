const { ConflictError, NotFoundError } = require("../../core/errors");
const { buildLocalPageOptimization, buildOptimizationPatch } = require("./local-page-optimizer");

class AgencySeoService {
  constructor(repository) { this.repository = repository; }
  listSites() { return this.repository.listSites(); }
  async getSite(id) { const site = await this.repository.getSiteById(id); if (!site) throw new NotFoundError("Mini-site SEO introuvable."); return site; }
  async createSite(data) { const existing = await this.repository.getSiteByAgencyId(data.agencyId); if (existing) throw new ConflictError("Cette agence possède déjà un mini-site SEO.", { agencyId: data.agencyId, siteId: existing.id }); return this.repository.createSite(data); }
  async updateSite(id, data) { await this.getSite(id); return this.repository.updateSite(id, data); }
  listPages(siteId) { return this.repository.listPages(siteId); }
  async getPage(id) { const page = await this.repository.getPageById(id); if (!page) throw new NotFoundError("Page SEO introuvable."); return page; }
  async createPage(data) { await this.getSite(data.siteId); return this.repository.createPage(data); }
  async updatePage(id, data) { await this.getPage(id); return this.repository.updatePage(id, data); }

  async previewLocalOptimization(id) {
    const page = await this.getPage(id);
    return { pageId: page.id, current: { seoTitle: page.seoTitle, seoDescription: page.seoDescription, introduction: page.introduction, localCity: page.localCity, content: page.content }, proposal: buildLocalPageOptimization(page.site, page) };
  }

  async applyLocalOptimization(id, { reviewed = false } = {}) {
    if (reviewed !== true) throw new ConflictError("La proposition SEO doit être relue avant application.", { pageId: id, required: "reviewed=true" });
    const page = await this.getPage(id);
    const proposal = buildLocalPageOptimization(page.site, page);
    const updated = await this.repository.updatePage(id, buildOptimizationPatch(page, proposal));
    return { page: updated, optimization: proposal.optimization };
  }
}

module.exports = AgencySeoService;
