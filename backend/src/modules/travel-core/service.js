"use strict";

const { parseLimit, requireSearchQuery } = require("./validation");
const {
  mergeSearchItems,
} = require("./search-engine");

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

    const [directGroups, aliasGroups] = await Promise.all([
      this.repository.search(q, limit),
      this.repository.searchAliases(q, Math.min(limit * 3, 100)),
    ]);

    const mapGroups = (groups) => [
      ...groups.countries.map((item) => ({
        type: "country",
        id: item.id,
        slug: item.slug,
        name: item.name,
        status: item.status,
        subtitle: item.continent || null,
        data: item,
      })),

      ...groups.regions.map((item) => ({
        type: "region",
        id: item.id,
        slug: item.slug,
        name: item.name,
        status: item.status,
        subtitle: item.country?.name || null,
        data: item,
      })),

      ...groups.cities.map((item) => ({
        type: "city",
        id: item.id,
        slug: item.slug,
        name: item.name,
        status: item.status,
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
        status: item.status,
        subtitle:
          item.cityRef?.name ||
          item.regionRef?.name ||
          item.countryRef?.name ||
          item.country,
        data: item,
      })),
    ];

    const directItems = mapGroups(directGroups);
    const aliasItems = mapGroups(aliasGroups);
    const items = mergeSearchItems(q, directItems, aliasItems, limit);

    return {
      query: q,
      count: items.length,
      byType: items.reduce(
        (counts, item) => {
          counts[item.type] += 1;
          return counts;
        },
        {
          country: 0,
          region: 0,
          city: 0,
          destination: 0,
        }
      ),
      items,
    };
  }
}

module.exports = {
  TravelCoreService,
};
