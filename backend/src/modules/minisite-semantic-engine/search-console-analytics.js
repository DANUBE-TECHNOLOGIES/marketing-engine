"use strict";

const crypto = require("node:crypto");

const SEARCH_ANALYTICS_ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites";
const DEFAULT_DAYS = 28;
const DEFAULT_ROW_LIMIT = 25000;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function required(name, value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    const error = new Error(`${name} is required.`);
    error.code = "MSE_25_48_SEARCH_CONSOLE_ARGUMENT_REQUIRED";
    throw error;
  }
  return normalized;
}
function isoDate(date) { return date.toISOString().slice(0, 10); }
function defaultDateRange(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 3));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (DEFAULT_DAYS - 1));
  return { startDate: isoDate(start), endDate: isoDate(end) };
}
function normalizeRows(rows = []) {
  return rows.map((row) => ({
    query: String(row?.keys?.[0] || "").trim(),
    page: String(row?.keys?.[1] || "").trim(),
    clicks: Number(row?.clicks || 0),
    impressions: Number(row?.impressions || 0),
    ctr: Number(row?.ctr || 0),
    position: Number(row?.position || 0),
  })).filter((row) => row.query || row.page);
}

async function fetchSearchAnalytics({ siteUrl, accessToken, startDate, endDate, rowLimit = DEFAULT_ROW_LIMIT, fetchImpl = fetch } = {}) {
  const property = required("SEARCH_CONSOLE_SITE_URL", siteUrl);
  const token = required("SEARCH_CONSOLE_ACCESS_TOKEN", accessToken);
  const range = startDate && endDate ? { startDate, endDate } : defaultDateRange();
  const limit = Math.min(Math.max(Number(rowLimit) || DEFAULT_ROW_LIMIT, 1), DEFAULT_ROW_LIMIT);
  const url = `${SEARCH_ANALYTICS_ENDPOINT}/${encodeURIComponent(property)}/searchAnalytics/query`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      startDate: range.startDate,
      endDate: range.endDate,
      dimensions: ["query", "page"],
      type: "web",
      aggregationType: "auto",
      dataState: "final",
      rowLimit: limit,
      startRow: 0,
    }),
  });
  let payload = null;
  try { payload = await response.json(); } catch (_) { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Search Console HTTP ${response.status}`);
    error.code = "MSE_25_48_SEARCH_CONSOLE_FETCH_FAILED";
    error.statusCode = response.status;
    error.details = payload?.error || payload || {};
    throw error;
  }
  const rows = normalizeRows(payload?.rows || []);
  const result = {
    type: "mse-25.48-search-console-analytics",
    source: "google-search-console",
    siteUrl: property,
    startDate: range.startDate,
    endDate: range.endDate,
    dimensions: ["query", "page"],
    searchType: "web",
    dataState: "final",
    rowLimit: limit,
    rowCount: rows.length,
    rows,
    readOnly: true,
    writes: false,
  };
  return { ...result, analyticsFingerprint: fingerprint(result) };
}

module.exports = { DEFAULT_DAYS, DEFAULT_ROW_LIMIT, defaultDateRange, normalizeRows, fetchSearchAnalytics, fingerprint };
