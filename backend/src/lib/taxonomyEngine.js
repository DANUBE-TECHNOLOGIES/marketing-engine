"use strict";

const TAXONOMY_TYPES = Object.freeze(["continent", "country", "region", "city", "destination"]);
const STATUS_VALUES = new Set(["draft", "published", "archived", "active"]);

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStatus(value, fallback = "draft") {
  const status = String(value || fallback).toLowerCase();
  return STATUS_VALUES.has(status) ? status : fallback;
}

function normalizeTaxonomyPayload(input = {}) {
  const continents = Array.isArray(input.continents) ? input.continents : [];
  return {
    version: String(input.version || "1.0"),
    continents: continents.map((continent) => {
      const name = String(continent.name || "").trim();
      const slug = slugify(continent.slug || name);
      return {
        name,
        slug,
        status: normalizeStatus(continent.status, "published"),
        metadata: continent.metadata || null,
        countries: (Array.isArray(continent.countries) ? continent.countries : []).map((country) => {
          const countryName = String(country.name || "").trim();
          const countrySlug = slugify(country.slug || countryName);
          return {
            ...country,
            name: countryName,
            slug: countrySlug,
            iso2: country.iso2 ? String(country.iso2).trim().toUpperCase() : null,
            iso3: country.iso3 ? String(country.iso3).trim().toUpperCase() : null,
            status: normalizeStatus(country.status),
            regions: (Array.isArray(country.regions) ? country.regions : []).map((region) => ({
              ...region,
              name: String(region.name || "").trim(),
              slug: slugify(region.slug || region.name),
              status: normalizeStatus(region.status),
              cities: (Array.isArray(region.cities) ? region.cities : []).map((city) => ({
                ...city,
                name: String(city.name || "").trim(),
                slug: slugify(city.slug || city.name),
                status: normalizeStatus(city.status),
                destinations: (Array.isArray(city.destinations) ? city.destinations : []).map((destination) => ({
                  ...destination,
                  name: String(destination.name || "").trim(),
                  slug: slugify(destination.slug || destination.name),
                  status: normalizeStatus(destination.status),
                })),
              })),
            })),
            cities: (Array.isArray(country.cities) ? country.cities : []).map((city) => ({
              ...city,
              name: String(city.name || "").trim(),
              slug: slugify(city.slug || city.name),
              status: normalizeStatus(city.status),
              destinations: (Array.isArray(city.destinations) ? city.destinations : []).map((destination) => ({
                ...destination,
                name: String(destination.name || "").trim(),
                slug: slugify(destination.slug || destination.name),
                status: normalizeStatus(destination.status),
              })),
            })),
            destinations: (Array.isArray(country.destinations) ? country.destinations : []).map((destination) => ({
              ...destination,
              name: String(destination.name || "").trim(),
              slug: slugify(destination.slug || destination.name),
              status: normalizeStatus(destination.status),
            })),
          };
        }),
      };
    }),
  };
}

function validateTaxonomyPayload(input = {}) {
  const taxonomy = normalizeTaxonomyPayload(input);
  const errors = [];
  const warnings = [];
  const seen = Object.fromEntries(TAXONOMY_TYPES.map((type) => [type, new Set()]));
  const counts = Object.fromEntries(TAXONOMY_TYPES.map((type) => [type, 0]));

  function check(type, item, path) {
    counts[type] += 1;
    if (!item.name) errors.push({ code: "NAME_REQUIRED", type, path, message: "Le nom est obligatoire." });
    if (!item.slug) errors.push({ code: "SLUG_REQUIRED", type, path, message: "Le slug est obligatoire." });
    if (item.slug && seen[type].has(item.slug)) errors.push({ code: "DUPLICATE_SLUG", type, path, slug: item.slug, message: `Slug ${type} dupliqué.` });
    if (item.slug) seen[type].add(item.slug);
  }

  taxonomy.continents.forEach((continent, continentIndex) => {
    const continentPath = `continents[${continentIndex}]`;
    check("continent", continent, continentPath);
    continent.countries.forEach((country, countryIndex) => {
      const countryPath = `${continentPath}.countries[${countryIndex}]`;
      check("country", country, countryPath);
      if (country.iso2 && !/^[A-Z]{2}$/.test(country.iso2)) errors.push({ code: "INVALID_ISO2", type: "country", path: countryPath, message: "iso2 doit contenir 2 lettres." });
      if (country.iso3 && !/^[A-Z]{3}$/.test(country.iso3)) errors.push({ code: "INVALID_ISO3", type: "country", path: countryPath, message: "iso3 doit contenir 3 lettres." });

      country.regions.forEach((region, regionIndex) => {
        const regionPath = `${countryPath}.regions[${regionIndex}]`;
        check("region", region, regionPath);
        region.cities.forEach((city, cityIndex) => {
          const cityPath = `${regionPath}.cities[${cityIndex}]`;
          check("city", city, cityPath);
          city.destinations.forEach((destination, destinationIndex) => check("destination", destination, `${cityPath}.destinations[${destinationIndex}]`));
        });
      });
      country.cities.forEach((city, cityIndex) => {
        const cityPath = `${countryPath}.cities[${cityIndex}]`;
        check("city", city, cityPath);
        city.destinations.forEach((destination, destinationIndex) => check("destination", destination, `${cityPath}.destinations[${destinationIndex}]`));
      });
      country.destinations.forEach((destination, destinationIndex) => check("destination", destination, `${countryPath}.destinations[${destinationIndex}]`));
    });
  });

  if (counts.continent === 0) warnings.push({ code: "EMPTY_TAXONOMY", message: "Aucun continent fourni." });
  return { ok: errors.length === 0, taxonomy, counts, errors, warnings };
}

function buildTaxonomyTree({ countries = [], regions = [], cities = [], destinations = [] } = {}) {
  const continents = new Map();
  const ensureContinent = (name) => {
    const title = String(name || "Non classé").trim() || "Non classé";
    const slug = slugify(title) || "non-classe";
    if (!continents.has(slug)) continents.set(slug, { type: "continent", name: title, slug, countries: [] });
    return continents.get(slug);
  };
  const regionsByCountry = new Map();
  const citiesByCountry = new Map();
  const destinationsByParent = new Map();

  for (const region of regions) {
    if (!regionsByCountry.has(region.countryId)) regionsByCountry.set(region.countryId, []);
    regionsByCountry.get(region.countryId).push({ ...region, type: "region", cities: [] });
  }
  for (const city of cities) {
    if (!citiesByCountry.has(city.countryId)) citiesByCountry.set(city.countryId, []);
    citiesByCountry.get(city.countryId).push({ ...city, type: "city", destinations: [] });
  }
  for (const destination of destinations) {
    const parentKey = destination.cityId ? `city:${destination.cityId}` : destination.regionId ? `region:${destination.regionId}` : `country:${destination.countryId || "unlinked"}`;
    if (!destinationsByParent.has(parentKey)) destinationsByParent.set(parentKey, []);
    destinationsByParent.get(parentKey).push({ ...destination, type: "destination" });
  }

  for (const country of countries) {
    const regionItems = regionsByCountry.get(country.id) || [];
    const cityItems = citiesByCountry.get(country.id) || [];
    const regionMap = new Map(regionItems.map((region) => [region.id, region]));
    for (const city of cityItems) {
      city.destinations = destinationsByParent.get(`city:${city.id}`) || [];
      if (city.regionId && regionMap.has(city.regionId)) regionMap.get(city.regionId).cities.push(city);
    }
    for (const region of regionItems) region.destinations = destinationsByParent.get(`region:${region.id}`) || [];
    const directCities = cityItems.filter((city) => !city.regionId || !regionMap.has(city.regionId));
    const continent = ensureContinent(country.continent);
    continent.countries.push({
      ...country,
      type: "country",
      regions: regionItems,
      cities: directCities,
      destinations: destinationsByParent.get(`country:${country.id}`) || [],
    });
  }
  return [...continents.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

function summarizeTaxonomy({ countries = [], regions = [], cities = [], destinations = [] } = {}) {
  const continents = new Set(countries.map((country) => slugify(country.continent || "Non classé")));
  const linkedDestinations = destinations.filter((destination) => destination.countryId || destination.regionId || destination.cityId).length;
  return {
    continents: continents.size,
    countries: countries.length,
    regions: regions.length,
    cities: cities.length,
    destinations: destinations.length,
    linkedDestinations,
    unlinkedDestinations: destinations.length - linkedDestinations,
    coveragePercent: destinations.length ? Math.round((linkedDestinations / destinations.length) * 10000) / 100 : 100,
  };
}

module.exports = {
  TAXONOMY_TYPES,
  slugify,
  normalizeTaxonomyPayload,
  validateTaxonomyPayload,
  buildTaxonomyTree,
  summarizeTaxonomy,
};
