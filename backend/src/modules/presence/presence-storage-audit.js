"use strict";

const REQUIRED_TABLES = Object.freeze([
  "PresenceOperationAudit",
  "PresenceOperationSnapshot",
  "PresenceCampaign",
  "PresenceCampaignEvent",
  "PresenceCampaignExecution",
  "PresenceCampaignReport",
  "PresenceCitationObservation"
]);

function evaluatePresenceStorage(rows = []) {
  const found = new Set(rows.map((row) => row.tableName || row.table_name).filter(Boolean));
  const missing = REQUIRED_TABLES.filter((table) => !found.has(table));
  return Object.freeze({
    ready: missing.length === 0,
    required: REQUIRED_TABLES,
    present: Object.freeze([...found]),
    missing: Object.freeze(missing)
  });
}

async function auditPresenceStorage(prisma) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT table_name AS "tableName"
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name IN ('PresenceOperationAudit', 'PresenceOperationSnapshot', 'PresenceCampaign', 'PresenceCampaignEvent', 'PresenceCampaignExecution', 'PresenceCampaignReport', 'PresenceCitationObservation')
    ORDER BY table_name
  `);
  return evaluatePresenceStorage(rows);
}

module.exports = { REQUIRED_TABLES, evaluatePresenceStorage, auditPresenceStorage };
