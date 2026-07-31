"use strict";

const { parseLimit, requireSearchQuery } = require("./validation");

class TravelCoreService {
  constructor(repository) {
    if (!repository) throw new Error("TravelCoreService requires repository");
    this.repository = repository;
  }

  overview() {
    return this.repository.overview();
  }

  listCountries(query = {}) {
    return this.repository.listCountries({
      status: query.status || undefined,
      limit: parseLimit(query.limit),
    });
  }

  async getCountry(idOrSlug) {
    const country = await this.repository.findCountry(String(idOrSlug));
    if (!country) {
      const error = new Error("Pays introuvable.");
      error.statusCode = 404;
      error.code = "COUNTRY_NOT_FOUND";
      throw error;
    }
    return country;
  }

  listRegions(query = {}) {
    return this.repository.listRegions({
      countryId: query.countryId || undefined,
      status: query.status || undefined,
      limit: parseLimit(query.limit),
    });
  }

  listCities(query = {}) {
    return this.repository.listCities({
      countryId: query.countryId || undefined,
      regionId: query.regionId || undefined,
      status: query.status || undefined,
      limit: parseLimit(query.limit),
    });
  }

  listDestinations(query = {}) {
    return this.repository.listDestinations({
      countryId: query.countryId || undefined,
      regionId: query.regionId || undefined,
      cityId: query.cityId || undefined,
      status: query.status || undefined,
      type: query.type || undefined,
      limit: parseLimit(query.limit),
    });
  }

  async getDestination(idOrSlug) {
    const destination = await this.repository.findDestination(String(idOrSlug));
    if (!destination) {
      const error = new Error("Destination introuvable.");
      error.statusCode = 404;
      error.code = "DESTINATION_NOT_FOUND";
      throw error;
    }
    return destination;
  }

  async search(query = {}) {
    const q = requireSearchQuery(query.q);
    const limit = parseLimit(query.limit, 20, 100);
    const groups = await this.repository.search(q, limit);

    const items = [
      ...groups.countries.map((item) => ({
        type: "country",
        id: item.id,
        slug: item.slug,
        name: item.name,
        subtitle: item.continent || null,
        data: item,
      })),
      ...groups.regions.map((item) => ({
        type: "region",
        id: item.id,
        slug: item.slug,
        name: item.name,
        subtitle: item.country?.name || null,
        data: item,
      })),
      ...groups.cities.map((item) => ({
        type: "city",
        id: item.id,
        slug: item.slug,
        name: item.name,
        subtitle: [
          item.region?.name,
          item.country?.name,
        ].filter(Boolean).join(", "),
        data: item,
      })),
      ...groups.destinations.map((item) => ({
        type: "destination",
        id: item.id,
        slug: item.slug,
        name: item.name,
        subtitle:
          item.cityRef?.name ||
          item.regionRef?.name ||
          item.countryRef?.name ||
          item.country,
        data: item,
      })),
    ];

    return {
      query: q,
      count: items.length,
      byType: {
        country: groups.countries.length,
        region: groups.regions.length,
        city: groups.cities.length,
        destination: groups.destinations.length,
      },
      items,
    };
  }
}

module.exports = {
  TravelCoreService,
};
