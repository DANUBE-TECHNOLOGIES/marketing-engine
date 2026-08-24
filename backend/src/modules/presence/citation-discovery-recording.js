"use strict";

const { directoryNameForProviderKey } = require("./directory-bridge");

async function recordDiscoveredCitation(prisma, { agency, providerKey, candidate }) {
  const directoryName = directoryNameForProviderKey(providerKey);
  if (!directoryName) {
    const error = new Error(`Provider ${providerKey} has no LocalDirectory mapping`);
    error.status = 409;
    throw error;
  }
  if (!candidate?.url) {
    const error = new Error("Citation candidate URL is required");
    error.status = 400;
    throw error;
  }

  const directory = await prisma.localDirectory.findUnique({ where: { name: directoryName } });
  if (!directory) {
    const error = new Error(`LocalDirectory ${directoryName} is not initialized`);
    error.status = 409;
    throw error;
  }

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

  const score = Number(candidate.score || 0);
  const updated = await prisma.directoryListing.update({
    where: { id: listing.id },
    data: {
      listingUrl: candidate.url,
      status: "pending",
      notes: `Citation ${directoryName} découverte automatiquement (confiance ${score}/100). Validation NAP requise avant conformité.`,
      lastCheckedAt: new Date()
    }
  });

  return updated;
}

module.exports = { recordDiscoveredCitation };
