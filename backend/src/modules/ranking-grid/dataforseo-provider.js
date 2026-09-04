"use strict";

const { RankingGridProvider } = require("./provider");

const DEFAULT_ENDPOINT = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreCandidate(item, target = {}) {
  let score = 0;
  const placeId = String(item?.place_id || "");
  const cid = String(item?.cid || "");
  const title = normalizeText(item?.title);
  const address = normalizeText(item?.address || item?.snippet);
  const domain = normalizeText(item?.domain || item?.url);

  if (target.placeId && placeId === String(target.placeId)) score += 1000;
  if (target.cid && cid === String(target.cid)) score += 900;

  const targetName = normalizeText(target.name);
  if (targetName && title === targetName) score += 300;
  else if (targetName && title.includes(targetName)) score += 180;
  else if (targetName && targetName.includes(title) && title.length >= 8) score += 120;

  const targetAddress = normalizeText(target.address);
  if (targetAddress && address.includes(targetAddress)) score += 120;

  const targetPostalCode = normalizeText(target.postalCode);
  if (targetPostalCode && address.includes(targetPostalCode)) score += 80;

  const targetWebsite = normalizeText(target.website);
  if (targetWebsite && domain.includes(targetWebsite.replace(/^https? www /, ""))) score += 80;

  return score;
}

function selectAgencyItem(items, target) {
  const organicMaps = (Array.isArray(items) ? items : []).filter((item) => item?.type === "maps_search");
  const ranked = organicMaps
    .map((item) => ({ item, score: scoreCandidate(item, target) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || Number(a.item.rank_group || 9999) - Number(b.item.rank_group || 9999));

  if (!ranked.length || ranked[0].score < 120) return null;
  return ranked[0].item;
}

function extractResult(payload, target) {
  if (!payload || Number(payload.status_code) !== 20000) {
    const error = new Error(payload?.status_message || "DataForSEO request failed");
    error.code = `DATAFORSEO_${payload?.status_code || "INVALID_RESPONSE"}`;
    throw error;
  }

  const task = Array.isArray(payload.tasks) ? payload.tasks[0] : null;
  if (!task || Number(task.status_code) !== 20000) {
    const error = new Error(task?.status_message || "DataForSEO task failed");
    error.code = `DATAFORSEO_TASK_${task?.status_code || "INVALID_RESPONSE"}`;
    throw error;
  }

  const result = Array.isArray(task.result) ? task.result[0] : null;
  const item = selectAgencyItem(result?.items, target);
  const cost = Number(task.cost || payload.cost || 0);

  if (!item) {
    return {
      found: false,
      position: null,
      absolutePosition: null,
      cost: Number.isFinite(cost) ? cost : 0,
      providerMetadata: {
        provider: "dataforseo-google-maps-live",
        itemsCount: Number(result?.items_count || 0),
      },
    };
  }

  return {
    found: true,
    position: Number.isFinite(Number(item.rank_group)) ? Number(item.rank_group) : null,
    absolutePosition: Number.isFinite(Number(item.rank_absolute)) ? Number(item.rank_absolute) : null,
    title: item.title || null,
    url: item.url || null,
    rating: Number.isFinite(Number(item.rating?.value)) ? Number(item.rating.value) : null,
    reviews: Number.isFinite(Number(item.rating?.votes_count)) ? Number(item.rating.votes_count) : null,
    cost: Number.isFinite(cost) ? cost : 0,
    providerMetadata: {
      provider: "dataforseo-google-maps-live",
      placeId: item.place_id || null,
      cid: item.cid || null,
      resultLatitude: item.latitude ?? null,
      resultLongitude: item.longitude ?? null,
      category: item.category || null,
    },
  };
}

async function dataForSeoHttpError(response) {
  let payload = null;
  let raw = "";
  try {
    raw = await response.text();
    if (raw) payload = JSON.parse(raw);
  } catch {
    payload = null;
  }

  const task = Array.isArray(payload?.tasks) ? payload.tasks[0] : null;
  const providerStatusCode = task?.status_code ?? payload?.status_code ?? null;
  const providerStatusMessage = task?.status_message ?? payload?.status_message ?? null;
  const suffix = providerStatusCode == null ? "" : `_STATUS_${providerStatusCode}`;
  const detail = providerStatusMessage || (raw ? raw.slice(0, 500) : null);
  const message = detail
    ? `DataForSEO HTTP ${response.status}: ${detail}`
    : `DataForSEO HTTP ${response.status}`;

  const error = new Error(message);
  error.code = `DATAFORSEO_HTTP_${response.status}${suffix}`;
  error.httpStatus = response.status;
  error.providerStatusCode = providerStatusCode;
  error.providerStatusMessage = providerStatusMessage;
  return error;
}

class DataForSeoMapsRankingGridProvider extends RankingGridProvider {
  constructor({ login, password, fetchImpl = global.fetch, targetResolver, endpoint = DEFAULT_ENDPOINT, zoom = 15 } = {}) {
    super("dataforseo-google-maps-live");
    this.login = login ?? process.env.DATAFORSEO_LOGIN;
    this.password = password ?? process.env.DATAFORSEO_PASSWORD;
    this.fetchImpl = fetchImpl;
    this.targetResolver = targetResolver;
    this.endpoint = endpoint;
    this.zoom = Math.max(4, Math.min(21, Number(zoom) || 15));
  }

  async measurePoint({ keyword, latitude, longitude, agencyId }) {
    if (!this.login || !this.password) {
      const error = new Error("DataForSEO credentials are not configured");
      error.code = "DATAFORSEO_CREDENTIALS_MISSING";
      throw error;
    }
    if (typeof this.fetchImpl !== "function") {
      const error = new Error("Fetch implementation is unavailable");
      error.code = "DATAFORSEO_FETCH_UNAVAILABLE";
      throw error;
    }
    if (typeof this.targetResolver !== "function") {
      const error = new Error("Agency target resolver is not configured");
      error.code = "DATAFORSEO_TARGET_RESOLVER_MISSING";
      throw error;
    }

    const target = await this.targetResolver(Number(agencyId));
    if (!target) {
      const error = new Error("Agency target identity not found");
      error.code = "DATAFORSEO_TARGET_NOT_FOUND";
      throw error;
    }

    const auth = Buffer.from(`${this.login}:${this.password}`, "utf8").toString("base64");
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{
        keyword,
        language_code: "fr",
        location_coordinate: `${Number(latitude).toFixed(7)},${Number(longitude).toFixed(7)},${this.zoom}z`,
        search_places: false,
        search_this_area: true,
        depth: 100,
      }]),
    });

    if (!response.ok) throw await dataForSeoHttpError(response);

    const payload = await response.json();
    return extractResult(payload, target);
  }
}

module.exports = {
  DEFAULT_ENDPOINT,
  DataForSeoMapsRankingGridProvider,
  normalizeText,
  scoreCandidate,
  selectAgencyItem,
  extractResult,
  dataForSeoHttpError,
};
