"use strict";

class ContentGenerationRepository {
  constructor(prisma, tenantId) {
    this.prisma = prisma;
    this.tenantId = tenantId;
  }

  include() {
    return { campaign: { include: { tasks: { orderBy: { createdAt: "asc" } } } } };
  }

  getCampaign(id) {
    return this.prisma.marketingCampaign.findFirst({
      where: { id, tenantId: this.tenantId },
      include: { tasks: { orderBy: { createdAt: "asc" } } },
    });
  }

  list({ status, campaignId, limit = 50 } = {}) {
    return this.prisma.contentGenerationJob.findMany({
      where: {
        tenantId: this.tenantId,
        ...(status ? { status } : {}),
        ...(campaignId ? { campaignId } : {}),
      },
      include: this.include(),
      orderBy: [{ createdAt: "desc" }],
      take: Math.min(Math.max(Number(limit) || 50, 1), 200),
    });
  }

  get(id) {
    return this.prisma.contentGenerationJob.findFirst({
      where: { id, tenantId: this.tenantId },
      include: this.include(),
    });
  }

  findActive(campaignId) {
    return this.prisma.contentGenerationJob.findFirst({
      where: { tenantId: this.tenantId, campaignId, status: { in: ["queued", "running"] } },
      include: this.include(),
      orderBy: { createdAt: "desc" },
    });
  }

  create(data) {
    return this.prisma.contentGenerationJob.create({
      data: { ...data, tenantId: this.tenantId },
      include: this.include(),
    });
  }

  update(id, data) {
    return this.prisma.contentGenerationJob.update({
      where: { id },
      data,
      include: this.include(),
    });
  }

  updateCampaign(id, data) {
    return this.prisma.marketingCampaign.update({ where: { id }, data });
  }

  updateTask(id, data) {
    return this.prisma.campaignTask.update({ where: { id }, data });
  }
}

module.exports = ContentGenerationRepository;
