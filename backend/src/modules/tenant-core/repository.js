"use strict";

class TenantRepository {
  constructor(prisma) {
    if (!prisma) throw new Error("Prisma est requis");
    this.prisma = prisma;
  }

  findBySelector(selector) {
    if (!selector) return null;
    if (selector.id) return this.prisma.tenant.findUnique({ where: { id: selector.id } });
    return this.prisma.tenant.findUnique({ where: { slug: selector.slug } });
  }

  create(data) {
    return this.prisma.tenant.create({ data });
  }

  list({ status, limit = 50, cursor } = {}) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    return this.prisma.tenant.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  listAgencies(tenantId) {
    return this.prisma.agency.findMany({
      where: { tenantId },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });
  }

  attachAgency(tenantId, agencyId) {
    return this.prisma.agency.update({
      where: { id: Number(agencyId) },
      data: { tenantId },
    });
  }
}

module.exports = { TenantRepository };
