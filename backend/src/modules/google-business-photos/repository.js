"use strict";

class GoogleBusinessPhotoRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAgency(agencyId, tenantId) {
    return this.prisma.agency.findFirst({
      where: { id: Number(agencyId), tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        googleLocationId: true,
      },
    });
  }

  listByAgency(agencyId, tenantId) {
    return this.prisma.googleBusinessPhoto.findMany({
      where: {
        agencyId: Number(agencyId),
        tenantId,
        status: "active",
      },
      orderBy: [
        { isPrimary: "desc" },
        { category: "asc" },
        { position: "asc" },
      ],
    });
  }

  listPublicBySiteSlug(siteSlug, tenantId) {
    return this.prisma.googleBusinessPhoto.findMany({
      where: {
        tenantId,
        status: "active",
        agency: {
          agencySites: {
            some: { slug: siteSlug, tenantId },
          },
        },
      },
      orderBy: [
        { isPrimary: "desc" },
        { category: "asc" },
        { position: "asc" },
      ],
    });
  }

  async replaceAgencyPhotos(agencyId, tenantId, photos) {
    return this.prisma.$transaction(async (tx) => {
      await tx.googleBusinessPhoto.updateMany({
        where: { agencyId: Number(agencyId), tenantId },
        data: { status: "archived", isPrimary: false },
      });

      for (const photo of photos) {
        await tx.googleBusinessPhoto.upsert({
          where: {
            tenantId_googleMediaName: {
              tenantId,
              googleMediaName: photo.googleMediaName,
            },
          },
          update: {
            agencyId: Number(agencyId),
            category: photo.category,
            sourceUrl: photo.sourceUrl,
            thumbnailUrl: photo.thumbnailUrl,
            width: photo.width,
            height: photo.height,
            attribution: photo.attribution,
            isPrimary: photo.isPrimary,
            position: photo.position,
            status: "active",
            syncedAt: new Date(),
            metadata: photo.metadata,
          },
          create: {
            tenantId,
            agencyId: Number(agencyId),
            googleMediaName: photo.googleMediaName,
            category: photo.category,
            sourceUrl: photo.sourceUrl,
            thumbnailUrl: photo.thumbnailUrl,
            width: photo.width,
            height: photo.height,
            attribution: photo.attribution,
            isPrimary: photo.isPrimary,
            position: photo.position,
            status: "active",
            syncedAt: new Date(),
            metadata: photo.metadata,
          },
        });
      }

      return tx.googleBusinessPhoto.findMany({
        where: {
          agencyId: Number(agencyId),
          tenantId,
          status: "active",
        },
        orderBy: [
          { isPrimary: "desc" },
          { category: "asc" },
          { position: "asc" },
        ],
      });
    });
  }
}

module.exports = GoogleBusinessPhotoRepository;
