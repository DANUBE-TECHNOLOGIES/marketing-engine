"use strict";

class BrandRepository {
  constructor(prisma) { this.prisma = prisma; }

  findByTenantId(tenantId) {
    return this.prisma.brand.findUnique({ where: { tenantId } });
  }

  upsert(tenantId, data) {
    return this.prisma.brand.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data },
    });
  }

  findPublicByTenantSlug(slug) {
    return this.prisma.brand.findFirst({
      where: { tenant: { slug, status: "active" } },
      include: { tenant: { select: { slug: true, name: true } } },
    });
  }
}

module.exports = { BrandRepository };
