"use strict";

class TravelCoreRepository {
  constructor(prisma, tenantId) {
    if (!prisma) throw new Error("TravelCoreRepository requires Prisma");
    if (!tenantId) throw new Error("TravelCoreRepository requires tenantId");

    this.prisma = prisma;
    this.tenantId = tenantId;
  }

  listCountries({ status, limit = 100 } = {}) {
    return this.prisma.country.findMany({
      where: status ? { status } : undefined,
      include: {
        _count: {
          select: {
            regions: true,
            cities: true,
            destinations: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
    });
  }

  findCountry(idOrSlug) {
    return this.prisma.country.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
          { iso2: idOrSlug.toUpperCase() },
          { iso3: idOrSlug.toUpperCase() },
        ],
      },
      include: {
        regions: {
          orderBy: { name: "asc" },
        },
        cities: {
          orderBy: { name: "asc" },
        },
        destinations: {
          where: { tenantId: this.tenantId },
          orderBy: { name: "asc" },
        },
      },
    });
  }

  listRegions({ countryId, status, limit = 100 } = {}) {
    return this.prisma.region.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        country: true,
        _count: {
          select: {
            cities: true,
            destinations: true,
          },
        },
      },
      orderBy: [{ country: { name: "asc" } }, { name: "asc" }],
      take: limit,
    });
  }

  listCities({ countryId, regionId, status, limit = 100 } = {}) {
    return this.prisma.city.findMany({
      where: {
        ...(countryId ? { countryId } : {}),
        ...(regionId ? { regionId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        country: true,
        region: true,
        _count: {
          select: { destinations: true },
        },
      },
      orderBy: { name: "asc" },
      take: limit,
    });
  }

  listDestinations({
    countryId,
    regionId,
    cityId,
    status,
    type,
    limit = 100,
  } = {}) {
    return this.prisma.destination.findMany({
      where: {
        tenantId: this.tenantId,
        ...(countryId ? { countryId } : {}),
        ...(regionId ? { regionId } : {}),
        ...(cityId ? { cityId } : {}),
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        countryRef: true,
        regionRef: true,
        cityRef: true,
        themes: { include: { theme: true } },
        travelTypes: { include: { travelType: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { name: "asc" },
      take: limit,
    });
  }

  findDestination(idOrSlug) {
    return this.prisma.destination.findFirst({
      where: {
        tenantId: this.tenantId,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        countryRef: true,
        regionRef: true,
        cityRef: true,
        sections: { orderBy: { position: "asc" } },
        faqs: { orderBy: { position: "asc" } },
        themes: { include: { theme: true } },
        travelTypes: { include: { travelType: true } },
        tags: { include: { tag: true } },
        relationsFrom: {
          include: { target: true },
          orderBy: { score: "desc" },
        },
      },
    });
  }

  async search(query, limit = 20) {
    const insensitive = { contains: query, mode: "insensitive" };

    const [countries, regions, cities, destinations] = await Promise.all([
      this.prisma.country.findMany({
        where: {
          OR: [
            { name: insensitive },
            { slug: insensitive },
            { iso2: { equals: query, mode: "insensitive" } },
            { iso3: { equals: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        orderBy: { name: "asc" },
      }),

      this.prisma.region.findMany({
        where: {
          OR: [{ name: insensitive }, { slug: insensitive }],
        },
        include: { country: true },
        take: limit,
        orderBy: { name: "asc" },
      }),

      this.prisma.city.findMany({
        where: {
          OR: [{ name: insensitive }, { slug: insensitive }],
        },
        include: { country: true, region: true },
        take: limit,
        orderBy: { name: "asc" },
      }),

      this.prisma.destination.findMany({
        where: {
          tenantId: this.tenantId,
          OR: [
            { name: insensitive },
            { slug: insensitive },
            { country: insensitive },
            { region: insensitive },
            { tagline: insensitive },
            { summary: insensitive },
          ],
        },
        include: {
          countryRef: true,
          regionRef: true,
          cityRef: true,
        },
        take: limit,
        orderBy: { name: "asc" },
      }),
    ]);

    return { countries, regions, cities, destinations };
  }


  async searchAliases(query, limit = 50) {
    const normalizedQuery = String(query || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

    const aliases = await this.prisma.knowledgeAlias.findMany({
      where: {
        normalizedAlias: {
          contains: normalizedQuery,
          mode: "insensitive",
        },
        entityType: {
          in: ["country", "region", "city", "destination"],
        },
      },
      orderBy: [
        { isPrimary: "desc" },
        { normalizedAlias: "asc" },
      ],
      take: limit,
    });

    const grouped = {
      country: [],
      region: [],
      city: [],
      destination: [],
    };

    for (const alias of aliases) {
      grouped[alias.entityType].push(alias.entityId);
    }

    const [countries, regions, cities, destinations] = await Promise.all([
      grouped.country.length
        ? this.prisma.country.findMany({
            where: { id: { in: [...new Set(grouped.country)] } },
          })
        : [],

      grouped.region.length
        ? this.prisma.region.findMany({
            where: { id: { in: [...new Set(grouped.region)] } },
            include: { country: true },
          })
        : [],

      grouped.city.length
        ? this.prisma.city.findMany({
            where: { id: { in: [...new Set(grouped.city)] } },
            include: { country: true, region: true },
          })
        : [],

      grouped.destination.length
        ? this.prisma.destination.findMany({
            where: {
              tenantId: this.tenantId,
              id: { in: [...new Set(grouped.destination)] },
            },
            include: {
              countryRef: true,
              regionRef: true,
              cityRef: true,
            },
          })
        : [],
    ]);

    return { countries, regions, cities, destinations };
  }

  async overview() {
    const [countries, regions, cities, destinations] = await Promise.all([
      this.prisma.country.count(),
      this.prisma.region.count(),
      this.prisma.city.count(),
      this.prisma.destination.count({
        where: { tenantId: this.tenantId },
      }),
    ]);

    return { countries, regions, cities, destinations };
  }
}

module.exports = TravelCoreRepository;
