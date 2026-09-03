"use strict";
const { NotFoundError } = require("../../core/errors");
const Repository = require("./repository");
const { buildPlan } = require("./planner");
const { composePage } = require("./composer");
class ContentFactoryService {
  constructor(prisma) { this.repo = new Repository(prisma); }
  async run(input) {
    const destination = await this.repo.getDestination(input.destinationSlug);
    if (!destination) throw new NotFoundError("Destination introuvable.");
    let site = null;
    if (input.siteId || input.siteSlug) {
      site = await this.repo.getSite(input);
      if (!site) throw new NotFoundError("Mini-site introuvable.");
    }
    const virtualSite = site || { id: null, slug: "preview", basePath: "/destinations" };
    const plan = buildPlan(destination, input);
    const pages = plan.pages.map((page) => composePage(page, destination, virtualSite));
    const existingSlugs = new Set((site?.pages || []).map((p) => p.slug));
    const analysis = {
      total: pages.length,
      existing: pages.filter((p) => existingSlugs.has(p.slug)).map((p) => p.slug),
      missing: pages.filter((p) => !existingSlugs.has(p.slug)).map((p) => p.slug),
    };
    analysis.coverage = analysis.total ? Math.round((analysis.existing.length / analysis.total) * 100) : 0;
    let persistence = null;
    if (input.persist) persistence = await this.repo.persist(site, pages, input.replace);
    return { ok: true, mode: input.persist ? "persist" : "preview", destination: plan.destination, site: site ? { id: site.id, slug: site.slug, name: site.name } : null, analysis, pages, persistence };
  }
}
module.exports = ContentFactoryService;
