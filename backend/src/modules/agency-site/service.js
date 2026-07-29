const AgencySiteRepository = require("./repository");
const SiteBuilder = require("./builders/site-builder");
const ContentBuilder = require("./builders/content-builder");
const NavigationBuilder = require("./builders/navigation-builder");
const SitemapBuilder = require("./builders/sitemap-builder");
class AgencySiteService {
  constructor(prisma, tenantId) { this.repo = new AgencySiteRepository(prisma, tenantId); this.siteBuilder = new SiteBuilder(); this.contentBuilder = new ContentBuilder(); this.navigationBuilder = new NavigationBuilder(); this.sitemapBuilder = new SitemapBuilder(); }
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
      for (const section of this.contentBuilder.build(page, agency, site)) await this.repo.upsertSection(saved.id, section);
    }
    return this.get(agencyId);
  }
  async compose(agencyId) {
    const agency = await this.repo.getAgency(agencyId);
    if (!agency) { const e = new Error(`Agence ${agencyId} introuvable`); e.statusCode = 404; throw e; }
    const current = await this.repo.findByAgencyId(agencyId);
    if (!current) return this.generate(agencyId);
    for (const page of current.pages) for (const section of this.contentBuilder.build(page, agency, current)) await this.repo.upsertSection(page.id, section);
    return this.get(agencyId);
  }
  async rebuild(agencyId, options = {}) { const current = await this.repo.findByAgencyId(agencyId); if (current) { await this.repo.deleteSectionsForSite(current.id); await this.repo.deletePages(current.id); } return this.generate(agencyId, options); }
  async get(agencyId) { const site = await this.repo.findByAgencyId(agencyId); if (!site) { const e = new Error(`Site de l'agence ${agencyId} introuvable`); e.statusCode = 404; throw e; } return { ...site, navigation: this.navigationBuilder.build(site.pages), metrics: { pageCount: site.pages.length, sectionCount: site.pages.reduce((n,p)=>n+(p.sections?.length||0),0), incompleteLegalSections: site.pages.flatMap(p=>p.sections||[]).filter(s=>s.jsonContent?.status?.startsWith("requires-")).length } }; }
  async page(agencyId, slug = "") { const page = await this.repo.findPage(agencyId, slug); if (!page) { const e = new Error(`Page ${slug || "accueil"} introuvable`); e.statusCode = 404; throw e; } return page; }
  async publicSite(siteSlug) {
    const site = await this.repo.findPublicSite(siteSlug);
    if (!site) { const e = new Error(`Site ${siteSlug} introuvable`); e.statusCode = 404; throw e; }
    return { ...site, navigation: this.navigationBuilder.build(site.pages), metrics: { pageCount: site.pages.length, sectionCount: site.pages.reduce((n,p)=>n+(p.sections?.length||0),0) } };
  }
  async publicPage(siteSlug, slug = "") {
    const page = await this.repo.findPublicPage(siteSlug, slug);
    if (!page) { const e = new Error(`Page publique ${slug || "accueil"} introuvable`); e.statusCode = 404; throw e; }
    return page;
  }
  async sitemap(agencyId, origin) { const site = await this.get(agencyId); return this.sitemapBuilder.build(site, site.pages, origin); }
  async robots(agencyId, origin) { const site = await this.get(agencyId); return this.sitemapBuilder.robots(site, origin); }
}
module.exports = AgencySiteService;
