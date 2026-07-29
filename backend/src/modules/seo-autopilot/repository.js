"use strict";

class SeoAutopilotRepository {
  constructor(prisma) { this.prisma = prisma; }

  createRun(data) {
    return this.prisma.seoAutopilotRun.create({ data });
  }

  createActions(runId, actions) {
    if (!actions.length) return Promise.resolve({ count: 0 });
    return this.prisma.seoAutopilotAction.createMany({
      data: actions.map((action) => ({ ...action, runId })),
    });
  }

  getRun(id) {
    return this.prisma.seoAutopilotRun.findUnique({
      where: { id },
      include: { actions: { orderBy: { order: "asc" } }, auditEvents: { orderBy: { createdAt: "asc" } } },
    });
  }

  listRuns({ siteId, status, limit = 50 } = {}) {
    return this.prisma.seoAutopilotRun.findMany({
      where: { ...(siteId ? { siteId } : {}), ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(200, Number(limit || 50))),
    });
  }

  updateRun(id, data) { return this.prisma.seoAutopilotRun.update({ where: { id }, data }); }
  updateAction(id, data) { return this.prisma.seoAutopilotAction.update({ where: { id }, data }); }
  createAuditEvent(data) { return this.prisma.seoAutopilotAuditEvent.create({ data }); }
}

module.exports = { SeoAutopilotRepository };
