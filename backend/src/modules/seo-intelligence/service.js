"use strict";
const SeoIntelligenceRepository = require("./repository");
const { analyzePage } = require("./analyzer");
class SeoIntelligenceService {
  constructor(prisma) { this.repository = new SeoIntelligenceRepository(prisma); }
  async analyzePage(id) { const page = await this.repository.findPage(id); if (!page) throw notFound("Page introuvable."); return analyzePage(page); }
  async analyzeSite(id) {
    const site = await this.repository.findSite(id); if (!site) throw notFound("Mini-site introuvable.");
    const pages = site.pages.map(analyzePage);
    const score = pages.length ? Math.round(pages.reduce((sum, report) => sum + report.score, 0) / pages.length) : 0;
    return { site: { id: site.id, name: site.name, slug: site.slug, status: site.status }, score, grade: require("./score/calculator").grade(score), pageCount: pages.length, criticalPages: pages.filter(report => report.recommendations.some(item => item.severity === "critical")).length, pages, analyzedAt: new Date().toISOString() };
  }
  report(id) { return this.analyzePage(id); }
}
function notFound(message) { const error = new Error(message); error.statusCode = 404; error.code = "SEO_RESOURCE_NOT_FOUND"; error.isOperational = true; return error; }
module.exports = SeoIntelligenceService;
