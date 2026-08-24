"use strict";

const crypto = require("node:crypto");

function createOperationId(prefix = "presence") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function jsonOrNull(value) {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

async function appendOperationAudit(prisma, event) {
  const operationId = event.operationId || createOperationId(event.providerKey || "presence");
  await prisma.$executeRaw`
    INSERT INTO "PresenceOperationAudit"
      ("operationId", "providerKey", "agencyId", "listingId", "scope", "eventType", "status", "riskLevel", "payload", "result", "error")
    VALUES
      (${operationId}, ${event.providerKey}, ${event.agencyId ?? null}, ${event.listingId ?? null}, ${event.scope || "agency"},
       ${event.eventType}, ${event.status}, ${event.riskLevel ?? null},
       CAST(${jsonOrNull(event.payload)} AS JSONB), CAST(${jsonOrNull(event.result)} AS JSONB), CAST(${jsonOrNull(event.error)} AS JSONB))
  `;
  return operationId;
}

async function listOperationAudit(prisma, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit || 100), 500));
  const agencyId = options.agencyId ? Number(options.agencyId) : null;
  const providerKey = options.providerKey || null;
  const operationId = options.operationId || null;
  return prisma.$queryRaw`
    SELECT "id", "operationId", "providerKey", "agencyId", "listingId", "scope",
           "eventType", "status", "riskLevel", "payload", "result", "error", "createdAt"
    FROM "PresenceOperationAudit"
    WHERE (${agencyId}::INTEGER IS NULL OR "agencyId" = ${agencyId})
      AND (${providerKey}::TEXT IS NULL OR "providerKey" = ${providerKey})
      AND (${operationId}::TEXT IS NULL OR "operationId" = ${operationId})
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT ${limit}
  `;
}

async function findLatestSubmittedOperationId(prisma, listingId, providerKey = "google_business_profile") {
  const rows = await prisma.$queryRaw`
    SELECT "operationId"
    FROM "PresenceOperationAudit"
    WHERE "listingId" = ${Number(listingId)}
      AND "providerKey" = ${providerKey}
      AND "eventType" = 'external_write'
      AND "status" = 'submitted'
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
  `;
  return rows[0]?.operationId || null;
}

module.exports = { createOperationId, appendOperationAudit, listOperationAudit, findLatestSubmittedOperationId };
