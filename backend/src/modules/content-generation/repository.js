"use strict";

class ContentGenerationRepository {
  constructor(prisma, tenantId) {
    if (!prisma) {
      throw new Error("ContentGenerationRepository requires Prisma");
    }

    if (!tenantId) {
      throw new Error("ContentGenerationRepository requires tenantId");
    }

    this.prisma = prisma;
    this.tenantId = tenantId;
  }

  campaignInclude() {
    return {
      tasks: {
        orderBy: { createdAt: "asc" },
      },

      destinations: {
        include: {
          destination: {
            include: {
              countryRef: true,
              regionRef: true,
              cityRef: true,

              sections: {
                orderBy: { position: "asc" },
              },

              faqs: {
                orderBy: { position: "asc" },
              },

              themes: {
                include: { theme: true },
              },

              travelTypes: {
                include: { travelType: true },
              },

              tags: {
                include: { tag: true },
              },

              relationsFrom: {
                include: { target: true },
                orderBy: { score: "desc" },
              },
            },
          },
        },
      },

      agencies: {
        include: {
          agency: true,
        },
      },

      assets: {
        orderBy: { createdAt: "desc" },
      },
    };
  }

  include() {
    return {
      campaign: {
        include: this.campaignInclude(),
      },
    };
  }

  getCampaign(id) {
    return this.prisma.marketingCampaign.findFirst({
      where: {
        id,
        tenantId: this.tenantId,
      },
      include: this.campaignInclude(),
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

      take: Math.min(
        Math.max(Number(limit) || 50, 1),
        200
      ),
    });
  }

  get(id) {
    return this.prisma.contentGenerationJob.findFirst({
      where: {
        id,
        tenantId: this.tenantId,
      },

      include: this.include(),
    });
  }

  findActive(campaignId) {
    return this.prisma.contentGenerationJob.findFirst({
      where: {
        tenantId: this.tenantId,
        campaignId,
        status: {
          in: ["queued", "running"],
        },
      },

      include: this.include(),

      orderBy: {
        createdAt: "desc",
      },
    });
  }

  create(data) {
    return this.prisma.contentGenerationJob.create({
      data: {
        ...data,
        tenantId: this.tenantId,
      },

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
    return this.prisma.marketingCampaign.update({
      where: { id },
      data,
    });
  }

  updateTask(id, data) {
    return this.prisma.campaignTask.update({
      where: { id },
      data,
    });
  }

  findAssetByTask(taskId) {
    return this.prisma.campaignAsset.findFirst({
      where: {
        taskId,
        campaign: {
          tenantId: this.tenantId,
        },
      },
    });
  }

  createAsset(data) {
    return this.prisma.campaignAsset.create({
      data,
    });
  }

  updateAsset(id, data) {
    return this.prisma.campaignAsset.update({
      where: { id },
      data,
    });
  }

  async upsertAssetForTask(taskId, data) {
    const existing = await this.findAssetByTask(taskId);

    if (existing) {
      return this.updateAsset(existing.id, data);
    }

    return this.createAsset({
      ...data,
      taskId,
    });
  }

  upsertAsset(data) {
    if (!data?.taskId) {
      throw new Error("Generated campaign asset requires taskId");
    }

    const { taskId, ...assetData } = data;

    return this.upsertAssetForTask(taskId, assetData);
  }
}

module.exports = ContentGenerationRepository;
