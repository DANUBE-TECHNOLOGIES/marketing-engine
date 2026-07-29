"use strict";

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function absoluteUrl(path, baseUrl) {
  const raw = String(path || "/").trim() || "/";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = normalizeBaseUrl(baseUrl);
  if (!base) return raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

module.exports = { normalizeBaseUrl, absoluteUrl };
