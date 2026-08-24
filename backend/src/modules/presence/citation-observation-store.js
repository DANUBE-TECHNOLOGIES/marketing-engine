"use strict";

function json(value) { return JSON.stringify(value ?? null); }

async function appendCitationObservation(prisma, row) {
  await prisma.$executeRaw`
    INSERT INTO "PresenceCitationObservation"
      ("agencyId", "providerKey", "listingId", "listingUrl", "observed", "diff")
    VALUES
      (${row.agencyId}, ${row.providerKey}, ${row.listingId ?? null}, ${row.listingUrl ?? null}, CAST(${json(row.observed)} AS JSONB), CAST(${json(row.diff)} AS JSONB))
  `;
}

async function getLatestCitationObservation(prisma, agencyId, providerKey) {
  const rows = await prisma.$queryRaw`
    SELECT * FROM "PresenceCitationObservation"
    WHERE "agencyId" = ${agencyId} AND "providerKey" = ${providerKey}
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

async function listCitationObservations(prisma, agencyId, providerKey, limit = 20) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 20), 100));
  return prisma.$queryRaw`
    SELECT * FROM "PresenceCitationObservation"
    WHERE "agencyId" = ${agencyId} AND "providerKey" = ${providerKey}
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT ${safeLimit}
  `;
}

module.exports = { appendCitationObservation, getLatestCitationObservation, listCitationObservations };
