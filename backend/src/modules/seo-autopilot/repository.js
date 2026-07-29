"use strict";
const { TenantScopedRepository } = require("../tenant-core/scoped-repository");
class SeoAutopilotRepository extends TenantScopedRepository {
  createRun(data) { return this.prisma.seoAutopilotRun.create({ data: this.createData(data) }); }
  createActions(runId, actions) { if (!actions.length) return Promise.resolve({ count: 0 }); return this.prisma.seoAutopilotAction.createMany({ data: actions.map((action) => ({ ...action, runId })) }); }
  getRun(id) { return this.prisma.seoAutopilotRun.findFirst({ where: this.scope({ id }), include: { actions: { orderBy: { order: "asc" } }, auditEvents: { orderBy: { createdAt: "asc" } } } }); }
  listRuns({ siteId, status, limit = 50 } = {}) { return this.prisma.seoAutopilotRun.findMany({ where: this.scope({ ...(siteId ? { siteId } : {}), ...(status ? { status } : {}) }), orderBy: { createdAt: "desc" }, take: Math.max(1, Math.min(200, Number(limit || 50))) }); }
  async updateRun(id, data) { const run = await this.getRun(id); if (!run) throw Object.assign(new Error("Exécution Autopilot introuvable pour ce tenant"), { statusCode: 404 }); return this.prisma.seoAutopilotRun.update({ where: { id }, data }); }
  async updateAction(id, data) { const action = await this.prisma.seoAutopilotAction.findFirst({ where: { id, run: { tenantId: this.tenantId } } }); if (!action) throw Object.assign(new Error("Action Autopilot introuvable pour ce tenant"), { statusCode: 404 }); return this.prisma.seoAutopilotAction.update({ where: { id }, data }); }
  async createAuditEvent(data) { const run = await this.getRun(data.runId); if (!run) throw Object.assign(new Error("Exécution Autopilot introuvable pour ce tenant"), { statusCode: 404 }); return this.prisma.seoAutopilotAuditEvent.create({ data }); }
}
module.exports = { SeoAutopilotRepository };
