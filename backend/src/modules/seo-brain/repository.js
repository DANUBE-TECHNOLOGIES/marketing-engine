"use strict";
const { TenantScopedRepository } = require("../tenant-core/scoped-repository");
class SeoBrainRepository extends TenantScopedRepository {
  findPage(id) { return this.prisma.agencySitePage.findFirst({ where: { id, site: { tenantId: this.tenantId } }, include: { site: true, sections: { orderBy: { displayOrder: "asc" } } } }); }
  findSite(id) { return this.prisma.agencySite.findFirst({ where: this.scope({ id }), include: { agency: true, pages: { include: { sections: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } } }); }
  listSites() { return this.prisma.agencySite.findMany({ where: this.scope(), include: { agency: true, pages: { include: { sections: true } } }, orderBy: { updatedAt: "desc" } }); }
  listCampaigns(siteId) { if (!this.prisma.marketingCampaign) return []; return this.prisma.marketingCampaign.findMany({ where: this.scope({ siteId }), include: { publications: true }, orderBy: { createdAt: "desc" }, take: 100 }); }
  listDestinations() { if (!this.prisma.destination) return []; return this.prisma.destination.findMany({ where: this.scope({ status: { in: ["published", "active"] } }), orderBy: { updatedAt: "desc" }, take: 250 }); }
}
module.exports = { SeoBrainRepository };
