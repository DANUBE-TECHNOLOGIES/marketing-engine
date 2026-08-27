"use strict";

const { projectGooglePresence } = require("./google-listing-adapter");

function fieldMatch(diff, field) {
  const item = diff?.checks?.find((check) => check.field === field);
  return Boolean(item?.match);
}

async function syncGoogleDirectoryListing(prisma, agency, listing) {
  const presence = await projectGooglePresence(prisma, agency);
  const checkedAt = new Date();

  if (!presence.connected) {
    return prisma.directoryListing.update({
      where: { id: listing.id },
      data: {
        status: "missing",
        nameCorrect: false,
        addressCorrect: false,
        phoneCorrect: false,
        websiteCorrect: false,
        notes: "Google Business Profile non raccordé à cette agence.",
        lastCheckedAt: checkedAt
      }
    });
  }

  const match = Boolean(presence.diff?.match);
  const drift = presence.diff?.drift || [];

  return prisma.directoryListing.update({
    where: { id: listing.id },
    data: {
      listingUrl: presence.listingUrl,
      status: match ? "validated" : "pending",
      nameCorrect: fieldMatch(presence.diff, "name"),
      addressCorrect: fieldMatch(presence.diff, "address"),
      phoneCorrect: fieldMatch(presence.diff, "phone"),
      websiteCorrect: fieldMatch(presence.diff, "website"),
      notes: match
        ? "Google Business Profile vérifié via Business Information API. NAP conforme."
        : `Google Business Profile vérifié via Business Information API. Dérive NAP: ${drift.join(", ") || "inconnue"}.`,
      lastCheckedAt: checkedAt
    }
  });
}

module.exports = { syncGoogleDirectoryListing };