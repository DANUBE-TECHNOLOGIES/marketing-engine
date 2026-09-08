"use strict";

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeBaseUrl(value) {
  const raw = clean(value).replace(/\/+$/g, "");
  if (!raw) throw new Error("MONDESCALE_AI_AGENT_BASE_URL is required.");
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("MONDESCALE_AI_AGENT_BASE_URL must use http or https.");
  }
  return parsed.toString().replace(/\/+$/g, "");
}

function positiveInt(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, Math.trunc(parsed)));
}

function validateDate(value, field) {
  const raw = clean(value);
  if (!raw || Number.isNaN(Date.parse(raw))) throw new Error(`Agent Knowledge gap ${field} is invalid.`);
  return raw;
}

function normalizeGap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Agent Knowledge gap item is invalid.");
  }
  const query = clean(value.query);
  const normalizedQuery = clean(value.normalizedQuery);
  const occurrences = Number(value.occurrences);
  if (!query || !normalizedQuery || !Number.isInteger(occurrences) || occurrences < 1) {
    throw new Error("Agent Knowledge gap item contract rejected.");
  }
  const siteSlug = value.siteSlug == null ? null : clean(value.siteSlug);
  if (value.siteSlug != null && !siteSlug) throw new Error("Agent Knowledge gap siteSlug is invalid.");
  return {
    siteSlug,
    query,
    normalizedQuery,
    occurrences,
    firstSeenAt: validateDate(value.firstSeenAt, "firstSeenAt"),
    lastSeenAt: validateDate(value.lastSeenAt, "lastSeenAt"),
  };
}

function validatePayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Agent Knowledge gap payload is invalid.");
  }
  if (value.mode !== "read-only" || value.inference !== false || value.source !== "knowledge-search-audit") {
    throw new Error("Agent Knowledge gap provenance contract rejected.");
  }
  if (!Array.isArray(value.gaps)) throw new Error("Agent Knowledge gap list is invalid.");
  const totalUnknownSearches = Number(value.totalUnknownSearches);
  const uniqueGapCount = Number(value.uniqueGapCount);
  if (!Number.isInteger(totalUnknownSearches) || totalUnknownSearches < 0 || !Number.isInteger(uniqueGapCount) || uniqueGapCount < 0) {
    throw new Error("Agent Knowledge gap summary contract rejected.");
  }
  return {
    mode: "read-only",
    inference: false,
    source: "knowledge-search-audit",
    siteSlug: value.siteSlug == null ? null : clean(value.siteSlug),
    totalUnknownSearches,
    uniqueGapCount,
    gaps: value.gaps.map(normalizeGap),
  };
}

async function report({ siteSlug, limit, fetchImpl = fetch } = {}) {
  const baseUrl = normalizeBaseUrl(process.env.MONDESCALE_AI_AGENT_BASE_URL);
  const adminToken = clean(process.env.MONDESCALE_AI_KNOWLEDGE_ADMIN_TOKEN);
  if (!adminToken) throw new Error("MONDESCALE_AI_KNOWLEDGE_ADMIN_TOKEN is required.");
  const timeoutMs = positiveInt(process.env.MONDESCALE_AI_KNOWLEDGE_TIMEOUT_MS, 3000, 15000);
  const boundedLimit = positiveInt(limit, 50, 200);
  const url = new URL("/api/knowledge/gaps", `${baseUrl}/`);
  const requestedSlug = clean(siteSlug);
  if (requestedSlug) url.searchParams.set("siteSlug", requestedSlug);
  url.searchParams.set("limit", String(boundedLimit));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-knowledge-admin-token": adminToken,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Agent Knowledge gap request failed (${response.status}).`);
    const payload = validatePayload(await response.json());
    if (requestedSlug && payload.siteSlug !== requestedSlug) {
      throw new Error("Agent Knowledge gap exact siteSlug contract rejected.");
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  normalizeGap,
  report,
  validatePayload,
};
