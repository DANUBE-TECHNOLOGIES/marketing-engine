const AgencySiteRepository = require("./repository");
const SiteBuilder = require("./builders/site-builder");
const NavigationBuilder = require("./builders/navigation-builder");
const SitemapBuilder = require("./builders/sitemap-builder");

class AgencySiteService {
  constructor(prisma) { this.repo = new AgencySiteRepository(prisma); this.siteBuilder = new SiteBuilder(); this.navigationBuilder = new NavigationBuilder(); this.sitemapBuilder = new SitemapBuilder(); }
  async generate(agencyId, options = {}) {
    const agency = await this.repo.getAgency(agencyId);
    if (!agency) { const e = new Error(`Agence ${agencyId} introuvable`); e.statusCode = 404; throw e; }
    const definition = this.siteBuilder.build(agency, options.slug);
    const site = await this.repo.upsertSite(definition.site);
    const ids = new Map();
    for (const page of definition.pages) {
      const parentId = page.parentKey ? ids.get(page.parentKey) || null : null;
      const saved = await this.repo.upsertPage(site.id, page, parentId);
      ids.set(page.key, saved.id);
    }
    return this.get(agencyId);
  }
  async rebuild(agencyId, options = {}) {
    const current = await this.repo.findByAgencyId(agencyId);
    if (current) await this.repo.deletePages(current.id);
    return this.generate(agencyId, options);
  }
  async get(agencyId) {
    const site = await this.repo.findByAgencyId(agencyId);
    if (!site) { const e = new Error(`Site de l'agence ${agencyId} introuvable`); e.statusCode = 404; throw e; }
    return { ...site, navigation: this.navigationBuilder.build(site.pages) };
  }
  async sitemap(agencyId, origin) { const site = await this.get(agencyId); return this.sitemapBuilder.build(site, site.pages, origin); }
  async robots(agencyId, origin) { const site = await this.get(agencyId); return this.sitemapBuilder.robots(site, origin); }
}
module.exports = AgencySiteService;
