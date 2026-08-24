"use strict";

const crypto = require("node:crypto");
const { buildNetworkCockpit } = require("./network-cockpit");

function stableId(input) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 20);
}

function normalizeIds(values) {
  if (!Array.isArray(values) || !values.length) return null;
  const ids = [...new Set(values.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  return ids.length ? new Set(ids) : null;
}

function normalizeKeys(values) {
  if (!Array.isArray(values) || !values.length) return null;
  const keys = [...new Set(values.map(String).map((value) => value.trim()).filter(Boolean))];
  return keys.length ? new Set(keys) : null;
}

function buildCampaignPlan(input = {}, options = {}) {
  const agencyIds = normalizeIds(options.agencyIds);
  const providerKeys = normalizeKeys(options.providerKeys);
  const maxItems = Math.max(1, Math.min(Number(options.maxItems || 25), 200));
  const allowSensitive = options.allowSensitive === true;
  const cockpit = buildNetworkCockpit(input);

  const selected = cockpit.interventionQueue.filter((item) => {
    if (agencyIds && !agencyIds.has(item.agencyId)) return false;
    if (providerKeys && !providerKeys.has(item.providerKey)) return false;
    if (!allowSensitive && Array.isArray(item.drift) && item.drift.some((field) => field === "name" || field === "address")) return false;
    return true;
  }).slice(0, maxItems);

  const executable = selected.filter((item) => item.executable === true);
  const manual = selected.filter((item) => item.executable !== true);
  const fingerprintInput = selected.map((item) => [item.source, item.agencyId, item.providerKey, item.listingId, item.status, item.drift]);

  return Object.freeze({
    campaignId: `presence-${stableId(fingerprintInput)}`,
    createdAt: new Date().toISOString(),
    policy: Object.freeze({ maxItems, allowSensitive, agencyIds: agencyIds ? [...agencyIds] : null, providerKeys: providerKeys ? [...providerKeys] : null }),
    baseline: Object.freeze({ health: cockpit.health, summary: cockpit.summary }),
    selectedCount: selected.length,
    executableCount: executable.length,
    manualCount: manual.length,
    selected: Object.freeze(selected),
    executable: Object.freeze(executable),
    manual: Object.freeze(manual)
  });
}

module.exports = { buildCampaignPlan, stableId };
