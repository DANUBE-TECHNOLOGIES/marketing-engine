"use strict";

class GoogleBusinessReviewsRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findTenantBySlug(slug) {
    return this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });
  }

  listGoogleAgencies(tenantId) {
    return this.prisma.agency.findMany({
      where: {
        tenantId,
        googleLocationId: { not: null },
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        city: true,
        googleLocationId: true,
      },
      orderBy: { city: "asc" },
    });
  }

  findKnownReviews(agencyId, googleReviewId) {
    return this.prisma.googleReview.findMany({
      where: {
        agencyId: Number(agencyId),
        googleReviewId,
      },
      orderBy: { id: "asc" },
    });
  }

  createReview(data) {
    return this.prisma.googleReview.create({ data });
  }

  updateReview(id, data) {
    return this.prisma.googleReview.update({
      where: { id: Number(id) },
      data,
    });
  }

  async findPublicSite(siteSlug, tenantSlug) {
    return this.prisma.agencySite.findFirst({
      where: {
        slug: String(siteSlug || "").trim(),
        tenant: { is: { slug: tenantSlug } },
      },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            city: true,
            googleReviewUrl: true,
          },
        },
      },
    });
  }

  listPublicReviews(agencyId) {
    return this.prisma.googleReview.findMany({
      where: {
        agencyId: Number(agencyId),
        rating: { gte: 1 },
      },
      orderBy: [
        { publishedAt: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        authorName: true,
        rating: true,
        comment: true,
        reply: true,
        status: true,
        googleReviewId: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        source: true,
      },
    });
  }
}

module.exports = GoogleBusinessReviewsRepository;
