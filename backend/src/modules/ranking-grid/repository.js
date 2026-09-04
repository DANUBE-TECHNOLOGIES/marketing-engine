"use strict";

class RankingGridRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getAgencyKeyword({ tenantId, agencyId, keywordId }) {
    return this.prisma.rankingKeyword.findFirst({
      where: {
        id: Number(keywordId),
        agencyId: Number(agencyId),
        active: true,
        agency: { tenantId },
      },
      select: { id: true, keyword: true, city: true, agencyId: true },
    });
  }

  async findCampaignByKey({ tenantId, key }) {
    return this.prisma.rankingGridCampaign.findFirst({
      where: { key, agency: { tenantId } },
      include: { points: { orderBy: [{ row: "asc" }, { col: "asc" }] } },
    });
  }

  async createCampaignWithPoints(input) {
    const { points, tenantId: _tenantId, ...campaign } = input;
    return this.prisma.rankingGridCampaign.create({
      data: {
        ...campaign,
        status: "pending",
        points: {
          create: points.map((point) => ({
            row: point.row,
            col: point.col,
            latitude: point.latitude,
            longitude: point.longitude,
            northKm: point.northKm,
            eastKm: point.eastKm,
            status: "pending",
          })),
        },
      },
      include: { points: { orderBy: [{ row: "asc" }, { col: "asc" }] } },
    });
  }

  async getCampaign({ tenantId, campaignId }) {
    return this.prisma.rankingGridCampaign.findFirst({
      where: { id: Number(campaignId), agency: { tenantId } },
      include: { points: { orderBy: [{ row: "asc" }, { col: "asc" }] } },
    });
  }

  async markCampaignRunning({ tenantId, campaignId }) {
    const campaign = await this.getCampaign({ tenantId, campaignId });
    if (!campaign) return null;
    return this.prisma.rankingGridCampaign.update({
      where: { id: campaign.id },
      data: { status: "running", startedAt: campaign.startedAt || new Date() },
    });
  }

  async savePointResult({ tenantId, campaignId, pointId, status, result = {} }) {
    const campaign = await this.getCampaign({ tenantId, campaignId });
    if (!campaign || !campaign.points.some((point) => point.id === Number(pointId))) return null;

    return this.prisma.rankingGridPoint.update({
      where: { id: Number(pointId) },
      data: {
        status,
        found: Boolean(result.found),
        position: Number.isFinite(Number(result.position)) ? Number(result.position) : null,
        absolutePosition: Number.isFinite(Number(result.absolutePosition)) ? Number(result.absolutePosition) : null,
        title: result.title || null,
        url: result.url || null,
        rating: Number.isFinite(Number(result.rating)) ? Number(result.rating) : null,
        reviews: Number.isFinite(Number(result.reviews)) ? Number(result.reviews) : null,
        cost: Number.isFinite(Number(result.cost)) ? Number(result.cost) : null,
        providerMetadata: result.providerMetadata || null,
        errorCode: result.errorCode || null,
        errorMessage: result.errorMessage || null,
        checkedAt: new Date(),
      },
    });
  }

  async completeCampaign({ tenantId, campaignId, status, summary }) {
    const campaign = await this.getCampaign({ tenantId, campaignId });
    if (!campaign) return null;
    return this.prisma.rankingGridCampaign.update({
      where: { id: campaign.id },
      data: { status, summary, completedAt: new Date() },
    });
  }
}

module.exports = { RankingGridRepository };
