"use strict";

const { projectGooglePresence } = require("./google-listing-adapter");

function fieldMatch(diff, field) {
  const item = diff?.checks?.find((check) => check.field === field);
  return Boolean(item?.match);
}

async function syncGoogleDirectoryListing(prisma, agency, listing) {
  const presence = await projectGooglePresence(prisma, agency);

  if (!presence.connected) {
    return prisma.directoryListing.update({
      where: { id: listing.id },
      data: {
        status: "missing",
        automationStatus: "todo",
        verified: false,
        score: 0,
        lastCheckedAt: new Date()
      }
    });
  }

  const match = Boolean(presence.diff?.match);
  const nameMatch = fieldMatch(presence.diff, "name");
  const addressMatch = fieldMatch(presence.diff, "address");
  const phoneMatch = fieldMatch(presence.diff, "phone");
  const websiteMatch = fieldMatch(presence.diff, "website");

  return prisma.directoryListing.update({
    where: { id: listing.id },
    data: {
      listingUrl: presence.listingUrl,
      status: match ? "validated" : "pending",
      nameCorrect: nameMatch,
      addressCorrect: addressMatch,
      phoneCorrect: phoneMatch,
      websiteCorrect: websiteMatch,
      phoneMatch,
      addressMatch,
      websiteMatch,
      verified: true,
      automationStatus: match ? "validated" : "drift_detected",
      score: presence.diff?.score ?? 0,
      notes: match
        ? "Google Business Profile vérifié via Business Information API."
        : `Dérive NAP Google détectée: ${(presence.diff?.drift || []).join(", ") || "inconnue"}`,
      lastCheckedAt: new Date()
    }
  });
}

module.exports = { syncGoogleDirectoryListing };