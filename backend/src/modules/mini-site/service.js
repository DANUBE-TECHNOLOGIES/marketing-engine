const MiniSiteRepository = require("./repository");
const MiniSiteGenerator = require("./generator");
const DestinationGenerator = require("./destination-generator");
const { NotFoundError, ConflictError } = require("../../core/errors");

class MiniSiteService {
  constructor(prisma, tenantId) { this.prisma = prisma; this.tenantId = tenantId; this.repo = new MiniSiteRepository(prisma, tenantId); this.generator = new MiniSiteGenerator(); this.destinationGenerator = new DestinationGenerator(); }
  list() { return this.repo.findAll(); }
  async get(id) { const site = await this.repo.findById(id); if (!site) throw new NotFoundError("Mini-site introuvable.", { id }); return site; }
  async create(data) { const agency = await (this.tenantId && this.prisma.agency.findFirst ? this.prisma.agency.findFirst({ where: { id: Number(data.agencyId), tenantId: this.tenantId } }) : this.prisma.agency.findUnique({ where: { id: Number(data.agencyId) } })); if (!agency) throw new NotFoundError("Agence introuvable.", { agencyId: data.agencyId }); try { return await this.repo.createWithPages(data, this.generator.generateDefaultPages(data.name)); } catch (error) { if (error?.code === "P2002") throw new ConflictError("Un mini-site utilise déjà ce slug.", { slug: data.slug }); throw error; } }
  async update(id, data) { await this.get(id); try { return await this.repo.update(id, data); } catch (error) { if (error?.code === "P2002") throw new ConflictError("Un mini-site utilise déjà ce slug.", { slug: data.slug }); throw error; } }
  async delete(id) { await this.get(id); return this.repo.delete(id); }
  async listPages(miniSiteId) { await this.get(miniSiteId); return this.repo.listPages(miniSiteId); }
  async createPage(miniSiteId, data) { await this.get(miniSiteId); try { return await this.repo.createPage(miniSiteId, data); } catch (error) { if (error?.code === "P2002") throw new ConflictError("Une page utilise déjà ce slug dans ce mini-site.", { miniSiteId, slug: data.slug }); throw error; } }
  async updatePage(id, data) { const page = await this.repo.findPage(id); if (!page) throw new NotFoundError("Page de mini-site introuvable.", { id }); try { return await this.repo.updatePage(id, data); } catch (error) { if (error?.code === "P2002") throw new ConflictError("Une page utilise déjà ce slug dans ce mini-site.", { slug: data.slug }); throw error; } }
  async deletePage(id) { const page = await this.repo.findPage(id); if (!page) throw new NotFoundError("Page de mini-site introuvable.", { id }); return this.repo.deletePage(id); }
  async createDestinationCluster(miniSiteId, data) {
    const site = await this.get(miniSiteId);
    const agencyId = Number(site.agencyId);
    const agency = Number.isInteger(agencyId) ? await (this.tenantId && this.prisma.agency.findFirst ? this.prisma.agency.findFirst({ where: { id: agencyId, tenantId: this.tenantId } }) : this.prisma.agency.findUnique({ where: { id: agencyId } })) : null;
    if (!agency) throw new NotFoundError("Agence du mini-site introuvable.", { agencyId: site.agencyId });
    const generated = this.destinationGenerator.generate(site, agency, data);
    const result = await this.repo.createPageCluster(miniSiteId, generated, data.overwrite);
    if (result.conflictSlugs.length) throw new ConflictError("Des pages de cette destination existent déjà.", { slugs: result.conflictSlugs, hint: "Renvoyer overwrite=true pour les régénérer." });
    return { miniSiteId, destination: data.destination, count: result.pages.length, pages: result.pages };
  }
}
module.exports = MiniSiteService;
