"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { REQUIRED_COLUMNS, evaluateDirectorySchema } = require("./directory-schema-audit");

function rowsFromContract(contract = REQUIRED_COLUMNS) {
  return Object.entries(contract).flatMap(([tableName, columns]) =>
    columns.map((columnName) => ({ tableName, columnName }))
  );
}

test("directory schema audit is ready when runtime contract is complete", () => {
  const result = evaluateDirectorySchema(rowsFromContract());
  assert.equal(result.ready, true);
  assert.deepEqual(result.tables.LocalDirectory.missing, []);
  assert.deepEqual(result.tables.DirectoryListing.missing, []);
});

test("directory schema audit exposes missing legacy runtime columns", () => {
  const rows = rowsFromContract().filter((row) =>
    !(row.tableName === "DirectoryListing" && ["score", "automationStatus"].includes(row.columnName))
  );
  const result = evaluateDirectorySchema(rows);
  assert.equal(result.ready, false);
  assert.deepEqual(result.tables.DirectoryListing.missing, ["automationStatus", "score"]);
});