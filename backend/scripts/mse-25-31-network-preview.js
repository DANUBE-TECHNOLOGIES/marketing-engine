"use strict";

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:4000";
const DEFAULT_TOP_PAGES = 20;

function normalizeOrigin(value) {
  return String(value || DEFAULT_BACKEND_ORIGIN).trim().replace(/\/+$/g, "");
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let payload = null;
  try { payload = await response.json(); } catch (_error) { payload = null; }
  if (!response.ok) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.code = payload?.error || "MSE_25_31_NETWORK_PREVIEW_HTTP_ERROR";
    error.statusCode = response.status;
    error.details = payload?.details || payload || {};
    throw error;
  }
  return payload;
}

function isSafePreview(payload = {}) {
  return payload.readOnly === true && payload.writes === false && payload.destructive === false;
}

function assertSafePreview(payload = {}) {
  if (isSafePreview(payload)) return payload;
  const error = new Error("MSE-25.31 refuse un payload qui n'est pas strictement read-only.");
  error.code = "MSE_25_31_UNSAFE_PREVIEW_PAYLOAD";
  error.details = {
    readOnly: payload.readOnly,
    writes: payload.writes,
    destructive: payload.destructive,
  };
  throw error;
}

function compactRow(row = {}) {
  return {
    agencyId: row.agencyId ?? null,
    siteSlug: row.siteSlug || null,
    city: row.city || null,
    pageSlug: row.pageSlug || null,
    priority: row.priority || null,
    priorityScore: Number(row.priorityScore || 0),
    executionClass: row.executionClass || null,
    beforeWarnings: Number(row.beforeWarnings || 0),
    projectedWarnings: Number(row.projectedWarnings || 0),
    projectedReduction: Number(row.projectedReduction || 0),
    operationTypes: row.operationTypes || [],
    manualReviewReasons: row.manualReviewReasons || [],
  };
}

function hasSourceFingerprint(operation = {}) {
  return /^[0-9a-f]{64}$/i.test(String(operation.sourceValueFingerprint || ""));
}

function operationPayloadComplete(operation = {}, bodyCopyPreview = null) {
  if (operation.type === "enrich-body") {
    return Boolean(bodyCopyPreview?.html && bodyCopyPreview?.title);
  }
  if (operation.type === "add-internal-link") {
    return operation.target?.scope === "block"
      && Boolean(String(operation.target?.pageSlug || "").trim())
      && operation.target?.blockType === "rich_text"
      && operation.target?.field === "content.html"
      && operation.target?.blockId !== null
      && operation.target?.blockId !== undefined
      && hasSourceFingerprint(operation)
      && Boolean(String(operation.link?.href || "").trim())
      && Boolean(String(operation.link?.label || "").trim())
      && Boolean(String(operation.finalValue || "").trim());
  }
  if (operation.type === "strengthen-title") {
    return operation.target?.scope === "page"
      && operation.target?.field === "seoTitle"
      && hasSourceFingerprint(operation)
      && Boolean(String(operation.finalValue || "").trim());
  }
  if (operation.type === "strengthen-meta-description") {
    return operation.target?.scope === "page"
      && operation.target?.field === "metaDescription"
      && hasSourceFingerprint(operation)
      && Boolean(String(operation.finalValue || "").trim());
  }
  if (operation.type === "strengthen-h1") {
    return operation.target?.scope === "block"
      && operation.target?.blockType === "hero"
      && operation.target?.field === "title"
      && operation.target?.blockId !== null
      && operation.target?.blockId !== undefined
      && hasSourceFingerprint(operation)
      && Boolean(String(operation.finalValue || "").trim());
  }
  return false;
}

function executionPayloads(payload = {}) {
  const rows = [];
  for (const agency of payload.agencies || []) {
    for (const proposal of agency.proposals || []) {
      const operations = Array.isArray(proposal.operations)
        ? JSON.parse(JSON.stringify(proposal.operations))
        : [];
      const bodyCopyPreview = proposal.bodyCopyPreview
        ? JSON.parse(JSON.stringify(proposal.bodyCopyPreview))
        : null;
      const completeOperationTypes = [];
      const incompleteOperationTypes = [];
      for (const operation of operations) {
        const type = operation?.type;
        if (!type) continue;
        if (operationPayloadComplete(operation, bodyCopyPreview)) completeOperationTypes.push(type);
        else incompleteOperationTypes.push(type);
      }
      const operationTypes = operations.map((operation) => operation?.type).filter(Boolean);
      rows.push({
        key: `${String(agency.siteSlug || "").trim()}:${String(proposal.pageSlug || "home").trim() || "home"}`,
        agencyId: agency.agencyId ?? null,
        siteSlug: agency.siteSlug || null,
        city: agency.city || null,
        pageSlug: proposal.pageSlug || "home",
        operations,
        bodyCopyPreview,
        safeguards: proposal.safeguards ? JSON.parse(JSON.stringify(proposal.safeguards)) : {},
        completeOperationTypes,
        incompleteOperationTypes,
        payloadComplete: operationTypes.length > 0 && incompleteOperationTypes.length === 0,
      });
    }
  }
  return rows.sort((left, right) => left.key.localeCompare(right.key, "fr"));
}

function operatorOutput(payload = {}, { topPages = DEFAULT_TOP_PAGES, includeAllPages = false } = {}) {
  const report = payload.operatorReport || {};
  const rows = Array.isArray(report.rows) ? report.rows : [];
  const limit = positiveInteger(topPages, DEFAULT_TOP_PAGES);
  const result = {
    ok: isSafePreview(payload),
    version: payload.version || "mse-25.31",
    operation: payload.operation || "preview-network-quality-uplift",
    readOnly: payload.readOnly === true,
    writes: payload.writes === true,
    destructive: payload.destructive === true,
    planFingerprint: payload.planFingerprint || null,
    minimumWords: payload.minimumWords ?? null,
    summary: payload.summary || {},
    operatorSummary: report.summary || {},
    excludedSites: payload.excludedSites || [],
    topPages: rows.slice(0, limit).map(compactRow),
    manualReviewNeeded: (report.manualReviewNeeded || []).slice(0, limit).map(compactRow),
  };
  if (includeAllPages) {
    result.allPages = rows.map(compactRow);
    result.executionPayloads = executionPayloads(payload);
  }
  return result;
}

async function run({ backendOrigin, tenantSlug, minimumWords, topPages, includeAllPages = false, emitOutput = true } = {}) {
  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const tenant = String(tenantSlug || process.env.TENANT_SLUG || "mondescale").trim();
  const body = {};
  if (minimumWords !== undefined || process.env.MINIMUM_WORDS) {
    body.minimumWords = Number(minimumWords ?? process.env.MINIMUM_WORDS);
  }

  const payload = await jsonRequest(`${origin}/minisite-seo-enrichment/network/quality-uplift/preview`, {
    method: "POST",
    headers: { "x-tenant-slug": tenant },
    body: JSON.stringify(body),
  });
  assertSafePreview(payload);
  const result = operatorOutput(payload, {
    topPages: topPages ?? process.env.TOP_PAGES ?? DEFAULT_TOP_PAGES,
    includeAllPages,
  });
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_31_NETWORK_PREVIEW_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_TOP_PAGES,
  assertSafePreview,
  compactRow,
  executionPayloads,
  hasSourceFingerprint,
  isSafePreview,
  jsonRequest,
  normalizeOrigin,
  operationPayloadComplete,
  operatorOutput,
  positiveInteger,
  run,
};
