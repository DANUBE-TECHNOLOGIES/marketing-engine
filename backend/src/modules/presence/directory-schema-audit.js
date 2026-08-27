"use strict";

const REQUIRED_COLUMNS = Object.freeze({
  LocalDirectory: Object.freeze([
    "id", "name", "website", "category", "impactScore", "difficulty", "priority",
    "active", "createdAt", "url", "submissionUrl", "submissionMode"
  ]),
  DirectoryListing: Object.freeze([
    "id", "agencyId", "directoryId", "listingUrl", "status", "nameCorrect",
    "addressCorrect", "phoneCorrect", "websiteCorrect", "hoursCorrect",
    "categoryCorrect", "notes", "lastCheckedAt", "createdAt", "updatedAt",
    "submissionPayload", "submittedAt", "automationStatus", "score", "verified",
    "phoneMatch", "addressMatch", "websiteMatch"
  ])
});

function evaluateDirectorySchema(rows = []) {
  const available = new Map();
  for (const row of rows) {
    const table = row.tableName || row.table_name;
    const column = row.columnName || row.column_name;
    if (!available.has(table)) available.set(table, new Set());
    available.get(table).add(column);
  }

  const tables = {};
  let ready = true;
  for (const [table, required] of Object.entries(REQUIRED_COLUMNS)) {
    const columns = available.get(table) || new Set();
    const missing = required.filter((column) => !columns.has(column));
    tables[table] = { required: required.length, present: required.length - missing.length, missing };
    if (missing.length) ready = false;
  }
  return { ready, tables };
}

async function auditDirectorySchema(prisma) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT table_name AS "tableName", column_name AS "columnName"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name IN ('LocalDirectory', 'DirectoryListing')
    ORDER BY table_name, ordinal_position
  `);
  return evaluateDirectorySchema(rows);
}

module.exports = { REQUIRED_COLUMNS, evaluateDirectorySchema, auditDirectorySchema };