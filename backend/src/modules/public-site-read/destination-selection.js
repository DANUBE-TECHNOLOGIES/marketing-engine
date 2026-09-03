"use strict";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function cleanReferences(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

function normalizeLimit(value, fallback = 6) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(24, Math.trunc(parsed)));
}

function destinationConfig(block) {
  const content = asObject(block?.content);
  const references = cleanReferences(content.destinationIds);
  const source = String(
    content.source ||
      content.__dataSource ||
      (references.length ? "manual" : "automatic")
  ).trim().toLowerCase();
  const selectionMode = String(
    content.selectionMode ||
      (references.length ? "manual" : "automatic")
  ).trim().toLowerCase();

  return {
    content,
    references,
    source,
    selectionMode,
    limit: normalizeLimit(content.limit),
  };
}

function destinationCatalog(destinations = []) {
  const ordered = [];
  const byReference = new Map();

  for (const destination of destinations || []) {
    const slug = String(destination?.slug || "").trim();
    if (!slug) continue;

    ordered.push(destination);
    if (destination?.id !== undefined && destination?.id !== null) {
      byReference.set(String(destination.id), destination);
    }
    byReference.set(slug, destination);
  }

  return { ordered, byReference };
}

function selectDestinationsForBlock(block, destinations = []) {
  const config = destinationConfig(block);
  const catalog = destinationCatalog(destinations);

  if (config.references.length && config.selectionMode !== "automatic") {
    return config.references
      .map((reference) => catalog.byReference.get(String(reference)))
      .filter(Boolean)
      .slice(0, config.limit);
  }

  if (
    ["travel-core", "catalog", "automatic", "auto"].includes(config.source) ||
    config.selectionMode === "automatic"
  ) {
    return catalog.ordered.slice(0, config.limit);
  }

  return [];
}

function selectDestinationSlugsForBlock(block, destinations = []) {
  const seen = new Set();
  const slugs = [];

  for (const destination of selectDestinationsForBlock(block, destinations)) {
    const slug = String(destination?.slug || "").trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }

  return slugs;
}

module.exports = {
  asObject,
  cleanReferences,
  normalizeLimit,
  destinationConfig,
  destinationCatalog,
  selectDestinationsForBlock,
  selectDestinationSlugsForBlock,
};