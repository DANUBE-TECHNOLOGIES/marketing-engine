"use strict";

async function setRuntimeListingState(prisma, listingId, state = {}) {
  const automationStatus = state.automationStatus ?? null;
  const submittedAt = state.submittedAt ?? null;
  const submissionPayload = state.submissionPayload ?? null;
  await prisma.$executeRaw`
    UPDATE "DirectoryListing"
    SET "automationStatus" = COALESCE(${automationStatus}, "automationStatus"),
        "submittedAt" = COALESCE(${submittedAt}, "submittedAt"),
        "submissionPayload" = COALESCE(${submissionPayload}, "submissionPayload")
    WHERE "id" = ${listingId}
  `;
  return { listingId, automationStatus, submittedAt, submissionPayload };
}

async function listSubmittedGoogleRuntimeListings(prisma, directoryId) {
  return prisma.$queryRaw`
    SELECT "id", "agencyId", "directoryId", "listingUrl", "status",
           "nameCorrect", "addressCorrect", "phoneCorrect", "websiteCorrect",
           "hoursCorrect", "categoryCorrect", "notes", "lastCheckedAt",
           "createdAt", "updatedAt", "automationStatus", "submittedAt"
    FROM "DirectoryListing"
    WHERE "directoryId" = ${directoryId}
      AND "automationStatus" IN ('submitted', 'verification_pending')
    ORDER BY "agencyId" ASC
  `;
}

module.exports = { setRuntimeListingState, listSubmittedGoogleRuntimeListings };
