const { TenantScopedRepository } = require("../tenant-core/scoped-repository");
class MarketingAutomationRepository extends TenantScopedRepository {
  createCampaign(data) { return this.prisma.marketingCampaign.create({ data: this.createData(data) }); }
  getCampaign(id) { return this.prisma.marketingCampaign.findFirst({ where: this.scope({ id }), include: { publications: { orderBy: { createdAt: "asc" } } } }); }
  listCampaigns({ siteId, status, from, to, limit = 100 } = {}) {
    return this.prisma.marketingCampaign.findMany({
      where: this.scope({
        ...(siteId ? { siteId } : {}), ...(status ? { status } : {}),
        ...((from || to) ? { scheduledAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {})
      }), include: { publications: true }, orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }], take: Math.min(Number(limit) || 100, 500)
    });
  }
  async createPublications(campaignId, outputs, scheduledAt) {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw Object.assign(new Error("Campagne introuvable pour ce tenant"), { statusCode: 404, code: "CAMPAIGN_NOT_FOUND" });
    return this.prisma.$transaction(outputs.map((output) => this.prisma.marketingPublication.create({ data: { campaignId, channel: output.channel, status: scheduledAt ? "scheduled" : "draft", scheduledAt: scheduledAt ? new Date(scheduledAt) : null, payload: output } })));
  }
  async updateCampaignStatus(id, status) {
    const campaign = await this.getCampaign(id);
    if (!campaign) throw Object.assign(new Error("Campagne introuvable pour ce tenant"), { statusCode: 404, code: "CAMPAIGN_NOT_FOUND" });
    return this.prisma.marketingCampaign.update({ where: { id }, data: { status } });
  }
}
module.exports = MarketingAutomationRepository;
