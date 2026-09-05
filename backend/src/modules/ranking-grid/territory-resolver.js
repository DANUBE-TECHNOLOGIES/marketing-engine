"use strict";

const DEFAULT_ENDPOINT = "https://data.geopf.fr/geocodage/reverse";
const DEFAULT_TIMEOUT_MS = 5000;
const SOURCE = "ign-geoplateforme-geocoding";

function normalizeFeature(feature) {
  const properties = feature?.properties && typeof feature.properties === "object"
    ? feature.properties
    : {};

  return {
    label: properties.label || properties.name || null,
    name: properties.name || null,
    housenumber: properties.housenumber || null,
    street: properties.street || properties.name || null,
    postcode: properties.postcode || null,
    city: properties.city || properties.municipality || null,
    citycode: properties.citycode || properties.insee || null,
    district: properties.district || properties.suburb || null,
    context: properties.context || null,
    type: properties.type || null,
    distance: Number.isFinite(Number(properties.distance)) ? Number(properties.distance) : null,
  };
}

function reverseGeocodeUrl({ endpoint = DEFAULT_ENDPOINT, latitude, longitude }) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new TypeError("finite latitude and longitude are required");
  }
  const url = new URL(endpoint);
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("limit", "1");
  return url.toString();
}

async function reverseGeocodePoint({
  latitude,
  longitude,
  fetchImpl = globalThis.fetch,
  endpoint = DEFAULT_ENDPOINT,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("fetch implementation is required");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(250, Number(timeoutMs) || DEFAULT_TIMEOUT_MS));
  try {
    const response = await fetchImpl(reverseGeocodeUrl({ endpoint, latitude, longitude }), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`IGN reverse geocoding failed with HTTP ${response.status}`);
      error.code = "RANKING_GRID_TERRITORY_HTTP_ERROR";
      error.statusCode = response.status;
      throw error;
    }
    const payload = await response.json();
    const feature = Array.isArray(payload?.features) ? payload.features[0] : null;
    return feature ? normalizeFeature(feature) : null;
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichPriorityCells(cells = [], {
  levels = ["p1", "p2"],
  maxCalls = 25,
  reverseGeocode = reverseGeocodePoint,
} = {}) {
  const allowed = new Set(levels.map((level) => String(level).toLowerCase()));
  const selected = cells.filter((cell) => allowed.has(String(cell.priority).toLowerCase()));
  if (selected.length > maxCalls) {
    const error = new Error(`territory enrichment exceeds maxCalls=${maxCalls}`);
    error.code = "RANKING_GRID_TERRITORY_MAX_CALLS_EXCEEDED";
    throw error;
  }

  const enriched = [];
  for (const cell of selected) {
    try {
      const territory = await reverseGeocode({
        latitude: cell.latitude,
        longitude: cell.longitude,
      });
      enriched.push({ ...cell, territory, territoryError: null });
    } catch (error) {
      enriched.push({
        ...cell,
        territory: null,
        territoryError: {
          code: error.code || "RANKING_GRID_TERRITORY_LOOKUP_FAILED",
          message: error.message,
        },
      });
    }
  }

  const byCity = {};
  for (const cell of enriched) {
    const city = cell.territory?.city || "unresolved";
    if (!byCity[city]) byCity[city] = { cells: 0, p1: 0, p2: 0, p3: 0, monitor: 0, ranks: [] };
    const bucket = byCity[city];
    bucket.cells += 1;
    if (bucket[cell.priority] != null) bucket[cell.priority] += 1;
    if (Number.isFinite(Number(cell.rank))) bucket.ranks.push(Number(cell.rank));
  }
  for (const bucket of Object.values(byCity)) {
    bucket.averageRank = bucket.ranks.length
      ? Math.round((bucket.ranks.reduce((sum, value) => sum + value, 0) / bucket.ranks.length) * 100) / 100
      : null;
    delete bucket.ranks;
  }

  return {
    source: SOURCE,
    externalCalls: selected.length,
    resolved: enriched.filter((cell) => cell.territory).length,
    unresolved: enriched.filter((cell) => !cell.territory).length,
    byCity,
    cells: enriched,
  };
}

module.exports = {
  DEFAULT_ENDPOINT,
  SOURCE,
  normalizeFeature,
  reverseGeocodeUrl,
  reverseGeocodePoint,
  enrichPriorityCells,
};
