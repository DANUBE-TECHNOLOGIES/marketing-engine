"use strict";

const { providerKeyForDirectory } = require("./directory-bridge");

function classifyListing(listing) {
  if (!listing) return "missing";
  if (listing.status === "validated") return "validated";
  if (listing.status === "pending") return "pending";
  if (listing.status === "error") return "error";
  return listing.status || "missing";
}

function buildNetworkCoverage(agencies = [], directories = [], listings = []) {
  const mappedDirectories = directories
    .filter((directory) => directory.active !== false)
    .map((directory) => ({ directory, providerKey: providerKeyForDirectory(directory) }))
    .filter((item) => item.providerKey);
  const byKey = new Map(listings.map((listing) => [`${listing.agencyId}:${listing.directoryId}`, listing]));
  const rows = [];
  const summary = { total: 0, validated: 0, pending: 0, missing: 0, error: 0, other: 0 };

  for (const agency of agencies) {
    for (const item of mappedDirectories) {
      const listing = byKey.get(`${agency.id}:${item.directory.id}`) || null;
      const status = classifyListing(listing);
      summary.total += 1;
      if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
      else summary.other += 1;
      rows.push(Object.freeze({
        agencyId: agency.id,
        agencyName: agency.name,
        providerKey: item.providerKey,
        directoryId: item.directory.id,
        directoryName: item.directory.name,
        status,
        listingUrl: listing?.listingUrl || null,
        lastCheckedAt: listing?.lastCheckedAt || null,
        nameCorrect: listing?.nameCorrect ?? null,
        addressCorrect: listing?.addressCorrect ?? null,
        phoneCorrect: listing?.phoneCorrect ?? null,
        websiteCorrect: listing?.websiteCorrect ?? null
      }));
    }
  }

  return Object.freeze({
    summary: Object.freeze({ ...summary, coveragePercent: summary.total ? Math.round((summary.validated / summary.total) * 100) : 0 }),
    rows: Object.freeze(rows)
  });
}

module.exports = { buildNetworkCoverage, classifyListing };
