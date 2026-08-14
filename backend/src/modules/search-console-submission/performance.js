"use strict";

const SEARCH_CONSOLE_API_ROOT = "https://www.googleapis.com/webmasters/v3";

function clampDays(value, fallback = 28) {
  const days = Number.parseInt(value, 10);
  if (!Number.isFinite(days)) return fallback;
  return Math.min(90, Math.max(1, days));
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateRange(days) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

function normalizeRows(rows, dimensions) {
  return Array.isArray(rows) ? rows.map((row) => ({
    dimensions: Object.fromEntries(dimensions.map((name, index) => [name, row?.keys?.[index] || null])),
    clicks: Number(row?.clicks || 0),
    impressions: Number(row?.impressions || 0),
    ctr: Number(row?.ctr || 0),
    position: Number(row?.position || 0),
  })) : [];
}

class SearchConsolePerformanceService {
  constructor({ provider } = {}) {
    this.provider = provider;
  }

  async query({ siteUrl, days = 28, dimensions = ["query"], rowLimit = 50 } = {}) {
    const target = String(siteUrl || "").trim();
    if (!target) {
      const error = new Error("La propriété Search Console est obligatoire.");
      error.code = "SEARCH_CONSOLE_SITE_URL_REQUIRED";
      error.statusCode = 400;
      throw error;
    }
    if (!this.provider?.isConfigured?.()) {
      const error = new Error("Le provider Google Search Console n’est pas configuré.");
      error.code = "SEARCH_CONSOLE_PROVIDER_NOT_CONFIGURED";
      error.statusCode = 503;
      throw error;
    }
    await this.provider.assertSiteAccess(target);
    const safeDays = clampDays(days);
    const safeDimensions = dimensions.filter((item) => ["query", "page", "date", "device", "country"].includes(item));
    const finalDimensions = safeDimensions.length ? safeDimensions : ["query"];
    const range = dateRange(safeDays);
    const endpoint = `${SEARCH_CONSOLE_API_ROOT}/sites/${encodeURIComponent(target)}/searchAnalytics/query`;
    const response = await this.provider.googleRequest(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...range, dimensions: finalDimensions, rowLimit: Math.min(1000, Math.max(1, Number(rowLimit || 50))) }),
    });
    const body = await response.json();
    const rows = normalizeRows(body?.rows, finalDimensions);
    const totals = rows.reduce((acc, row) => {
      acc.clicks += row.clicks;
      acc.impressions += row.impressions;
      return acc;
    }, { clicks: 0, impressions: 0 });
    return {
      siteUrl: target,
      ...range,
      days: safeDays,
      dimensions: finalDimensions,
      rowCount: rows.length,
      totals: {
        ...totals,
        ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
      },
      rows,
      note: "Search Console peut omettre certaines requêtes anonymisées et ne garantit pas toutes les lignes de détail.",
    };
  }
}

module.exports = { SearchConsolePerformanceService, clampDays, dateRange, normalizeRows };
