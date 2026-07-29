class MarketingAutomationRepository {
  constructor(prisma) { this.prisma = prisma; }
  createCampaign(data) { return this.prisma.marketingCampaign.create({ data }); }
  getCampaign(id) { return this.prisma.marketingCampaign.findUnique({ where: { id }, include: { publications: { orderBy: { createdAt: "asc" } } } }); }
  listCampaigns({ siteId, status, from, to, limit = 100 } = {}) {
    return this.prisma.marketingCampaign.findMany({
      where: {
        ...(siteId ? { siteId } : {}), ...(status ? { status } : {}),
        ...((from || to) ? { scheduledAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {})
      }, include: { publications: true }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }], take: Math.min(Number(limit) || 100, 500)
    });
  }
  createPublications(campaignId, outputs, scheduledAt) {
    return this.prisma.$transaction(outputs.map((output) => this.prisma.marketingPublication.create({ data: { campaignId, channel: output.channel, status: scheduledAt ? "scheduled" : "draft", scheduledAt: scheduledAt ? new Date(scheduledAt) : null, payload: output } })));
  }
  updateCampaignStatus(id, status) { return this.prisma.marketingCampaign.update({ where: { id }, data: { status } }); }
}
module.exports = MarketingAutomationRepository;
