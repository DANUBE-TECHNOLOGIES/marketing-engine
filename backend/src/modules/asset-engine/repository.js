function createAssetRepository(prisma) {
  function snapshot(asset, createdBy) {
    return {
      version: asset.currentVersion,
      title: asset.title,
      summary: asset.summary,
      payload: asset.payload,
      metadata: asset.metadata,
      tags: asset.tags,
      createdBy
    };
  }

  async function list({
    tenantId,
    page,
    limit,
    type,
    status,
    search
  }) {
    const where = {
      tenantId,
      deletedAt: null
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          slug: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          summary: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        orderBy: {
          updatedAt: "desc"
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.asset.count({ where })
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  function findById(tenantId, id) {
    return prisma.asset.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      }
    });
  }

  function findBySlug(tenantId, slug) {
    return prisma.asset.findFirst({
      where: {
        tenantId,
        slug
      }
    });
  }

  async function createWithVersion({
    tenantId,
    data,
    userId
  }) {
    return prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          ...data,
          tenantId,
          createdBy: userId,
          updatedBy: userId
        }
      });

      await tx.assetVersion.create({
        data: {
          assetId: asset.id,
          ...snapshot(asset, userId)
        }
      });

      return asset;
    });
  }

  async function updateWithVersion({
    asset,
    data,
    userId
  }) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: {
          id: asset.id
        },
        data: {
          ...data,
          currentVersion: {
            increment: 1
          },
          updatedBy: userId
        }
      });

      await tx.assetVersion.create({
        data: {
          assetId: updated.id,
          ...snapshot(updated, userId)
        }
      });

      return updated;
    });
  }

  function listVersions(assetId) {
    return prisma.assetVersion.findMany({
      where: {
        assetId
      },
      orderBy: {
        version: "desc"
      }
    });
  }

  function findVersion(assetId, version) {
    return prisma.assetVersion.findUnique({
      where: {
        assetId_version: {
          assetId,
          version
        }
      }
    });
  }

  async function changeLifecycle({
    asset,
    status,
    userId
  }) {
    const lifecycleData = {
      status,
      updatedBy: userId,
      currentVersion: {
        increment: 1
      }
    };

    if (status === "published") {
      lifecycleData.publishedAt = new Date();
      lifecycleData.archivedAt = null;
    }

    if (status === "archived") {
      lifecycleData.archivedAt = new Date();
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.asset.update({
        where: {
          id: asset.id
        },
        data: lifecycleData
      });

      await tx.assetVersion.create({
        data: {
          assetId: updated.id,
          ...snapshot(updated, userId)
        }
      });

      return updated;
    });
  }

  async function duplicate({
    source,
    slug,
    title,
    userId
  }) {
    return createWithVersion({
      tenantId: source.tenantId,
      userId,
      data: {
        type: source.type,
        status: "draft",
        title,
        slug,
        summary: source.summary,
        payload: source.payload,
        metadata: source.metadata,
        tags: source.tags
      }
    });
  }

  function softDelete(assetId, userId) {
    return prisma.asset.update({
      where: {
        id: assetId
      },
      data: {
        deletedAt: new Date(),
        updatedBy: userId
      }
    });
  }

  return {
    list,
    findById,
    findBySlug,
    createWithVersion,
    updateWithVersion,
    listVersions,
    findVersion,
    changeLifecycle,
    duplicate,
    softDelete
  };
}

module.exports = createAssetRepository;
