"use strict";

const { Prisma } = require("@prisma/client");

function jsonValue(value) {
  return value == null ? Prisma.JsonNull : value;
}

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
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT c.*
      FROM "RankingGridCampaign" c
      INNER JOIN "Agency" a ON a.id = c."agencyId"
      WHERE c."key" = ${key} AND a."tenantId" = ${tenantId}
      LIMIT 1
    `);
    if (!rows.length) return null;
    return this.getCampaign({ tenantId, campaignId: rows[0].id });
  }

  async createCampaignWithPoints(input) {
    const {
      tenantId, agencyId, keywordId, keyword, city, centerLat, centerLng,
      gridSize, spacingKm, provider, key, points,
    } = input;

    return this.prisma.$transaction(async (tx) => {
      const campaigns = await tx.$queryRaw(Prisma.sql`
        INSERT INTO "RankingGridCampaign"
          ("agencyId", "keywordId", "keyword", "city", "key", "centerLat", "centerLng", "gridSize", "spacingKm", "provider", "status", "createdAt", "updatedAt")
        VALUES
          (${agencyId}, ${keywordId}, ${keyword}, ${city}, ${key}, ${centerLat}, ${centerLng}, ${gridSize}, ${spacingKm}, ${provider}, 'pending', NOW(), NOW())
        ON CONFLICT ("key") DO NOTHING
        RETURNING *
      `);

      let campaign = campaigns[0];
      if (!campaign) {
        const existing = await tx.$queryRaw(Prisma.sql`
          SELECT c.* FROM "RankingGridCampaign" c
          INNER JOIN "Agency" a ON a.id = c."agencyId"
          WHERE c."key" = ${key} AND a."tenantId" = ${tenantId}
          LIMIT 1
        `);
        campaign = existing[0];
      }

      for (const point of points) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "RankingGridPoint"
            ("campaignId", "row", "col", "latitude", "longitude", "northKm", "eastKm", "status", "createdAt", "updatedAt")
          VALUES
            (${campaign.id}, ${point.row}, ${point.col}, ${point.latitude}, ${point.longitude}, ${point.northKm}, ${point.eastKm}, 'pending', NOW(), NOW())
          ON CONFLICT ("campaignId", "row", "col") DO NOTHING
        `);
      }

      const storedPoints = await tx.$queryRaw(Prisma.sql`
        SELECT * FROM "RankingGridPoint"
        WHERE "campaignId" = ${campaign.id}
        ORDER BY "row" ASC, "col" ASC
      `);
      return { ...campaign, points: storedPoints };
    });
  }

  async getCampaign({ tenantId, campaignId }) {
    const campaigns = await this.prisma.$queryRaw(Prisma.sql`
      SELECT c.*
      FROM "RankingGridCampaign" c
      INNER JOIN "Agency" a ON a.id = c."agencyId"
      WHERE c.id = ${Number(campaignId)} AND a."tenantId" = ${tenantId}
      LIMIT 1
    `);
    if (!campaigns.length) return null;
    const points = await this.prisma.$queryRaw(Prisma.sql`
      SELECT * FROM "RankingGridPoint"
      WHERE "campaignId" = ${Number(campaignId)}
      ORDER BY "row" ASC, "col" ASC
    `);
    return { ...campaigns[0], points };
  }

  async markCampaignRunning({ tenantId, campaignId }) {
    const campaign = await this.getCampaign({ tenantId, campaignId });
    if (!campaign) return null;
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "RankingGridCampaign"
      SET "status" = 'running', "startedAt" = COALESCE("startedAt", NOW()), "updatedAt" = NOW()
      WHERE id = ${campaign.id}
    `);
    return this.getCampaign({ tenantId, campaignId });
  }

  async savePointResult({ tenantId, campaignId, pointId, status, result = {} }) {
    const campaign = await this.getCampaign({ tenantId, campaignId });
    if (!campaign || !campaign.points.some((point) => Number(point.id) === Number(pointId))) return null;

    const position = Number.isFinite(Number(result.position)) ? Number(result.position) : null;
    const absolutePosition = Number.isFinite(Number(result.absolutePosition)) ? Number(result.absolutePosition) : null;
    const rating = Number.isFinite(Number(result.rating)) ? Number(result.rating) : null;
    const reviews = Number.isFinite(Number(result.reviews)) ? Number(result.reviews) : null;
    const cost = Number.isFinite(Number(result.cost)) ? Number(result.cost) : null;
    const metadata = result.providerMetadata == null ? null : JSON.stringify(result.providerMetadata);

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "RankingGridPoint"
      SET "status" = ${status},
          "found" = ${Boolean(result.found)},
          "position" = ${position},
          "absolutePosition" = ${absolutePosition},
          "title" = ${result.title || null},
          "url" = ${result.url || null},
          "rating" = ${rating},
          "reviews" = ${reviews},
          "cost" = ${cost},
          "providerMetadata" = ${metadata}::jsonb,
          "errorCode" = ${result.errorCode || null},
          "errorMessage" = ${result.errorMessage || null},
          "checkedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE id = ${Number(pointId)} AND "campaignId" = ${Number(campaignId)}
    `);
    return true;
  }

  async completeCampaign({ tenantId, campaignId, status, summary }) {
    const campaign = await this.getCampaign({ tenantId, campaignId });
    if (!campaign) return null;
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "RankingGridCampaign"
      SET "status" = ${status}, "summary" = ${JSON.stringify(jsonValue(summary))}::jsonb,
          "completedAt" = NOW(), "updatedAt" = NOW()
      WHERE id = ${campaign.id}
    `);
    return this.getCampaign({ tenantId, campaignId });
  }
}

module.exports = { RankingGridRepository };
