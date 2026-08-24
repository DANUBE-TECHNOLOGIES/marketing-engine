"use strict";

const { evaluateCitationObservation } = require("./citation-observation");
const { directoryNameForProviderKey } = require("./directory-bridge");

function fieldMatch(diff, field) {
  return Boolean(diff?.checks?.find((item) => item.field === field)?.match);
}

async function recordCitationObservation(prisma, { agency, providerKey, observed, listingUrl }) {
  const directoryName = directoryNameForProviderKey(providerKey);
  if (!directoryName) {
    const error = new Error(`Provider ${providerKey} has no LocalDirectory mapping`);
    error.status = 409;
    throw error;
  }

  const directory = await prisma.localDirectory.findUnique({ where: { name: directoryName } });
  if (!directory) {
    const error = new Error(`LocalDirectory ${directoryName} is not initialized`);
    error.status = 409;
    throw error;
  }

  const result = evaluateCitationObservation({ agency, providerKey, observed });
  let listing = await prisma.directoryListing.findUnique({
    where: {
      agencyId_directoryId: {
        agencyId: agency.id,
        directoryId: directory.id
      }
    }
  });

  if (!listing) {
    listing = await prisma.directoryListing.create({
      data: {
        agencyId: agency.id,
        directoryId: directory.id,
        status: "missing"
      }
    });
  }

  const updated = await prisma.directoryListing.update({
    where: { id: listing.id },
    data: {
      listingUrl: listingUrl || listing.listingUrl || null,
      status: result.diff.match ? "validated" : "pending",
      nameCorrect: fieldMatch(result.diff, "name"),
      addressCorrect: fieldMatch(result.diff, "address"),
      phoneCorrect: fieldMatch(result.diff, "phone"),
      websiteCorrect: fieldMatch(result.diff, "website"),
      notes: result.diff.match
        ? `Citation ${directoryName} observée : NAP conforme.`
        : `Citation ${directoryName} observée : dérive NAP ${result.diff.drift.join(", ") || "inconnue"}.`,
      lastCheckedAt: new Date()
    }
  });

  return { result, listing: updated };
}

module.exports = { recordCitationObservation };
