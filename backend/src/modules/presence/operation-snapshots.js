"use strict";

function jsonOrNull(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

async function appendOperationSnapshot(prisma, snapshot) {
  const propagationMs = snapshot.propagationMs == null ? null : BigInt(Math.max(0, Number(snapshot.propagationMs)));
  await prisma.$executeRaw`
    INSERT INTO "PresenceOperationSnapshot"
      ("operationId", "providerKey", "agencyId", "listingId", "phase", "canonicalNap", "remoteNap", "diff", "observedAt", "propagationMs")
    VALUES
      (${snapshot.operationId}, ${snapshot.providerKey}, ${snapshot.agencyId ?? null}, ${snapshot.listingId ?? null}, ${snapshot.phase},
       CAST(${jsonOrNull(snapshot.canonicalNap)} AS JSONB), CAST(${jsonOrNull(snapshot.remoteNap)} AS JSONB), CAST(${jsonOrNull(snapshot.diff)} AS JSONB),
       ${snapshot.observedAt || new Date()}, ${propagationMs})
  `;
  return snapshot.operationId;
}

async function listOperationSnapshots(prisma, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const operationId = options.operationId || null;
  const agencyId = options.agencyId ? Number(options.agencyId) : null;
  const providerKey = options.providerKey || null;
  return prisma.$queryRaw`
    SELECT "id", "operationId", "providerKey", "agencyId", "listingId", "phase",
           "canonicalNap", "remoteNap", "diff", "observedAt", "propagationMs"
    FROM "PresenceOperationSnapshot"
    WHERE (${operationId}::TEXT IS NULL OR "operationId" = ${operationId})
      AND (${agencyId}::INTEGER IS NULL OR "agencyId" = ${agencyId})
      AND (${providerKey}::TEXT IS NULL OR "providerKey" = ${providerKey})
    ORDER BY "observedAt" DESC, "id" DESC
    LIMIT ${limit}
  `;
}

async function getOperationSubmittedAt(prisma, operationId) {
  const rows = await prisma.$queryRaw`
    SELECT "createdAt"
    FROM "PresenceOperationAudit"
    WHERE "operationId" = ${operationId}
      AND "eventType" = 'external_write'
      AND "status" = 'submitted'
    ORDER BY "createdAt" ASC, "id" ASC
    LIMIT 1
  `;
  return rows[0]?.createdAt || null;
}

async function summarizePropagation(prisma, providerKey = null) {
  const rows = await prisma.$queryRaw`
    SELECT COUNT(*)::INTEGER AS "verifiedCount",
           AVG("propagationMs")::BIGINT AS "averagePropagationMs",
           MIN("propagationMs")::BIGINT AS "minPropagationMs",
           MAX("propagationMs")::BIGINT AS "maxPropagationMs"
    FROM "PresenceOperationSnapshot"
    WHERE "phase" = 'after_verified'
      AND "propagationMs" IS NOT NULL
      AND (${providerKey}::TEXT IS NULL OR "providerKey" = ${providerKey})
  `;
  return rows[0] || { verifiedCount: 0, averagePropagationMs: null, minPropagationMs: null, maxPropagationMs: null };
}

module.exports = {
  appendOperationSnapshot,
  listOperationSnapshots,
  getOperationSubmittedAt,
  summarizePropagation
};