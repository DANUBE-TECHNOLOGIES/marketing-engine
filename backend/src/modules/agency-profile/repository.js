"use strict";

class AgencyProfileRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAgency(agencyId) {
    return this.prisma.agency.findUnique({
      where: { id: Number(agencyId) },
      include: { profile: true },
    });
  }

  findBySiteSlug(siteSlug, tenantSlug) {
    return this.prisma.agencySite.findFirst({
      where: {
        slug: String(siteSlug || "").trim(),
        tenant: {
          is: {
            slug: String(tenantSlug || "").trim().toLowerCase(),
          },
        },
      },
      include: {
        agency: {
          include: { profile: true },
        },
      },
    });
  }

  upsert(agencyId, data) {
    return this.prisma.agencyProfile.upsert({
      where: { agencyId: Number(agencyId) },
      update: data,
      create: {
        agencyId: Number(agencyId),
        ...data,
      },
    });
  }
}

module.exports = AgencyProfileRepository;
