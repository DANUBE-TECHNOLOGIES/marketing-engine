"use strict";

class PublicDestinationRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findPublishedForTenant(tenantId, slug) {
    if (!tenantId || !slug) {
      return null;
    }

    return this.prisma.destination.findFirst({
      where: {
        tenantId,
        slug,
        status: "published",
      },
      include: {
        sections: {
          orderBy: {
            position: "asc",
          },
        },
        faqs: {
          orderBy: {
            position: "asc",
          },
        },
      },
    });
  }
}

module.exports = PublicDestinationRepository;
