"use strict";

class TenantScopedRepository {
  constructor(prisma, tenantId) {
    if (!prisma) throw new Error("Prisma est requis");
    this.prisma = prisma;
    this.tenantId = tenantId;
  }

  scope(where = {}) {
    return this.tenantId ? { ...where, tenantId: this.tenantId } : { ...where };
  }

  createData(data = {}) {
    return this.tenantId ? { ...data, tenantId: this.tenantId } : { ...data };
  }
}

module.exports = { TenantScopedRepository };
