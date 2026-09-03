"use strict";

const { composeDestinationPage, buildPageCreateData } = require("./miniSiteComposer");

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeDestinationSlugs(value) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(raw.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean))];
}

function clampLimit(value, fallback = 25, maximum = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

function existingBySlug(existingPages = []) {
  return new Map(asArray(existingPages).map((page) => [page.slug, page]));
}

function buildBatchPlan({ destinations, existingPages = [], site, agency, candidates = [], options = {} }) {
  if (!site?.id || !site?.slug) throw new Error("A valid mini-site is required");
  const existing = existingBySlug(existingPages);
  const overwrite = options.overwrite === true;
  const status = options.publish === true ? "published" : "draft";

  return asArray(destinations).map((destination) => {
    const current = existing.get(destination.slug) || null;
    if (current && !overwrite) {
      return {
        slug: destination.slug,
        destinationId: destination.id,
        action: "skip",
        reason: "already_exists",
        pageId: current.id,
      };
    }

    const composed = composeDestinationPage({
      destination,
      site,
      agency,
      candidates,
      options: { status, recommendationLimit: options.recommendationLimit, cardLimit: options.cardLimit },
    });

    return {
      slug: destination.slug,
      destinationId: destination.id,
      action: current ? "update" : "create",
      pageId: current?.id || null,
      composed,
      data: buildPageCreateData(composed, site.id),
    };
  });
}

function summarizeBatch(items = []) {
  return asArray(items).reduce((summary, item) => {
    summary.total += 1;
    const key = item.action === "create" ? "created" : item.action === "update" ? "updated" : item.action === "skip" ? "skipped" : "failed";
    summary[key] += 1;
    return summary;
  }, { total: 0, created: 0, updated: 0, skipped: 0, failed: 0 });
}

module.exports = {
  normalizeDestinationSlugs,
  clampLimit,
  buildBatchPlan,
  summarizeBatch,
};
