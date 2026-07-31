"use strict";

class SiteProvisioningRepository {
  constructor(prisma, tenantId) {
    this.prisma = prisma;
    this.tenantId = tenantId;
  }

  listAgencies(ids = null) {
    return this.prisma.agency.findMany({
      where: {
        tenantId: this.tenantId,
        ...(Array.isArray(ids) && ids.length ? { id: { in: ids.map(Number) } } : {}),
      },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        postalCode: true,
        phone: true,
        email: true,
        website: true,
        googleReviewUrl: true,
        agencySites: { select: { id: true, slug: true, status: true } },
      },
    });
  }

  getAgency(id) {
    return this.prisma.agency.findFirst({
      where: { id: Number(id), tenantId: this.tenantId },
      select: { id: true, name: true, city: true },
    });
  }

  getSiteByAgencyId(agencyId) {
    return this.prisma.agencySite.findFirst({
      where: { agencyId: Number(agencyId), tenantId: this.tenantId },
      include: { pages: { orderBy: { displayOrder: "asc" } } },
    });
  }

  findBlock(pageId, name) {
    return this.prisma.pageBlock.findFirst({
      where: { pageId, name, page: { site: { tenantId: this.tenantId } } },
      select: { id: true, name: true, blockType: true },
    });
  }

  createBlock(pageId, block) {
    return this.prisma.pageBlock.create({ data: { pageId, ...block } });
  }
}

module.exports = SiteProvisioningRepository;
