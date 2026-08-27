"use strict";

const { providerKeyForDirectory, legacySubmissionModeForProvider } = require("./directory-bridge");
const { getPresenceProvider } = require("./provider-registry");

const STATUS_WEIGHT = Object.freeze({ error: 50, missing: 45, not_found: 45, pending: 30, validated: 0 });
const FIELD_WEIGHT = Object.freeze({ name: 25, address: 25, phone: 20, website: 10, category: 8, hours: 7 });

function driftFields(listing) {
  if (!listing) return ["name", "address", "phone", "website"];
  const fields = [];
  if (listing.nameCorrect === false) fields.push("name");
  if (listing.addressCorrect === false) fields.push("address");
  if (listing.phoneCorrect === false) fields.push("phone");
  if (listing.websiteCorrect === false) fields.push("website");
  if (listing.categoryCorrect === false) fields.push("category");
  if (listing.hoursCorrect === false) fields.push("hours");
  return fields;
}

function scoreAnomaly({ listing, directory }) {
  const status = listing?.status || "missing";
  const fields = driftFields(listing);
  const impact = Number(directory?.impactScore || 0) * 8;
  const priority = Number(directory?.priority || 0) * 2;
  const difficultyPenalty = Number(directory?.difficulty || 0) * 3;
  const fieldScore = fields.reduce((sum, field) => sum + (FIELD_WEIGHT[field] || 0), 0);
  return Math.max(0, (STATUS_WEIGHT[status] || 10) + impact + priority + fieldScore - difficultyPenalty);
}

function buildAnomalyQueue(agencies = [], directories = [], listings = []) {
  const mapped = directories
    .map((directory) => ({ directory, providerKey: providerKeyForDirectory(directory) }))
    .filter((item) => item.providerKey && item.directory.active !== false);
  const byKey = new Map(listings.map((listing) => [`${listing.agencyId}:${listing.directoryId}`, listing]));
  const queue = [];

  for (const agency of agencies) {
    for (const item of mapped) {
      const listing = byKey.get(`${agency.id}:${item.directory.id}`) || null;
      const status = listing?.status || "missing";
      const fields = driftFields(listing);
      if (status === "validated" && fields.length === 0) continue;
      const provider = getPresenceProvider(item.providerKey);
      queue.push(Object.freeze({
        agencyId: agency.id,
        agencyName: agency.name,
        city: agency.city,
        providerKey: item.providerKey,
        directoryId: item.directory.id,
        directoryName: item.directory.name,
        status,
        drift: Object.freeze(fields),
        listingId: listing?.id || null,
        listingUrl: listing?.listingUrl || null,
        lastCheckedAt: listing?.lastCheckedAt || null,
        submissionMode: legacySubmissionModeForProvider(provider),
        score: scoreAnomaly({ listing, directory: item.directory })
      }));
    }
  }

  queue.sort((a, b) => b.score - a.score || a.agencyName.localeCompare(b.agencyName) || a.directoryName.localeCompare(b.directoryName));
  return Object.freeze(queue);
}

module.exports = { buildAnomalyQueue, scoreAnomaly, driftFields };
