"use strict";

class AiContentRepository {
  constructor(prisma, tenantId) { this.prisma = prisma; this.tenantId = tenantId; }

  getCampaign(id) {
    if (!id) return null;
    return this.prisma.marketingCampaign.findFirst({
      where: { id, tenantId: this.tenantId },
      include: { agencies: { include: { agency: true } }, destinations: { include: { destination: true } } },
    });
  }

  getPrompt(id) {
    if (!id) return null;
    return this.prisma.seoPrompt.findFirst({ where: { id, tenantId: this.tenantId, status: "active" } });
  }

  createJob(data) { return this.prisma.seoGenerationJob.create({ data: { ...data, tenantId: this.tenantId } }); }
  updateJob(id, data) { return this.prisma.seoGenerationJob.update({ where: { id }, data }); }

  getJob(id) {
    return this.prisma.seoGenerationJob.findFirst({
      where: { id, tenantId: this.tenantId },
      include: { prompt: true, contents: { orderBy: { createdAt: "desc" } }, campaign: true },
    });
  }

  listJobs(filters = {}) {
    return this.prisma.seoGenerationJob.findMany({
      where: {
        tenantId: this.tenantId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
        ...(filters.channel ? { channel: filters.channel } : {}),
      },
      include: { contents: true },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(filters.limit) || 50, 100),
    });
  }

  listPublishedContents(filters = {}) {
    const ids = Array.isArray(filters.ids)
      ? filters.ids.map(String).filter(Boolean).slice(0, 100)
      : [];
    const requestedLimit = Math.min(
      Math.max(Number(filters.limit) || 24, 1),
      100
    );

    return this.prisma.seoContent.findMany({
      where: {
        tenantId: this.tenantId,
        status: "published",
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(ids.length ? { id: { in: ids } } : {}),
      },
      orderBy: [
        { publishedAt: "desc" },
        { updatedAt: "desc" },
      ],
      take: ids.length
        ? Math.min(Math.max(requestedLimit, ids.length), 100)
        : requestedLimit,
    });
  }

  async nextRevision(channel, slug) {
    const latest = await this.prisma.seoContent.findFirst({
      where: { tenantId: this.tenantId, channel, slug },
      orderBy: { revision: "desc" },
      select: { revision: true },
    });
    return (latest?.revision || 0) + 1;
  }

  createContent(data) { return this.prisma.seoContent.create({ data: { ...data, tenantId: this.tenantId } }); }

  createCampaignAsset(data) {
    if (!data.campaignId) return null;
    return this.prisma.campaignAsset.create({ data });
  }
}

module.exports = AiContentRepository;
